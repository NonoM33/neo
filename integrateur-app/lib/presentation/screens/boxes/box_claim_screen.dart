import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/box.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../routes/app_router.dart';
import '../../widgets/ds/ds.dart';

/// Rattachement d'une box neuve au client du projet.
///
/// L'installateur scanne le QR affiche sur l'ecran e-ink de la box (ou recopie
/// le code en clair si la camera ne l'attrape pas). La box recoit alors sa cle
/// a sa prochaine annonce et bascule toute seule sur l'ecran de statut.
class BoxClaimScreen extends ConsumerStatefulWidget {
  const BoxClaimScreen({required this.projectId, super.key});

  final String projectId;

  @override
  ConsumerState<BoxClaimScreen> createState() => _BoxClaimScreenState();
}

class _BoxClaimScreenState extends ConsumerState<BoxClaimScreen> {
  final _codeController = TextEditingController();
  Project? _project;
  bool _loadingProject = true;
  bool _submitting = false;
  bool _scanLocked = false;
  ClaimedBox? _claimed;

  @override
  void initState() {
    super.initState();
    _loadProject();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _loadProject() async {
    final result = await ref.read(projectRepositoryProvider).getProject(widget.projectId);
    if (!mounted) return;
    setState(() {
      _loadingProject = false;
      _project = switch (result) {
        Success(data: final project) => project,
        Error() => null,
      };
    });
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanLocked || _submitting) return;
    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (raw == null) return;
    final token = normalizeProvisioningToken(raw);
    if (token == null) return; // un autre QR dans le champ : on ignore
    _scanLocked = true;
    _codeController.text = token;
    _submit(token);
  }

  Future<void> _submit(String raw) async {
    final project = _project;
    if (project == null) {
      showDsSnackbar(context, message: 'Projet introuvable', tone: DsTone.error);
      return;
    }
    final token = normalizeProvisioningToken(raw);
    if (token == null) {
      _scanLocked = false;
      showDsSnackbar(
        context,
        message: 'Code invalide : 20 caractères attendus, tels qu’affichés sur la box.',
        tone: DsTone.error,
      );
      return;
    }
    setState(() => _submitting = true);
    final result = await ref
        .read(boxRepositoryProvider)
        .claimBox(provisioningToken: token, clientId: project.clientId);
    if (!mounted) return;
    setState(() => _submitting = false);
    switch (result) {
      case Success(data: final box):
        setState(() => _claimed = box);
      case Error(failure: final failure):
        _scanLocked = false;
        showDsSnackbar(context, message: failure.message, tone: DsTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final client = _project?.client;
    final clientName =
        client == null ? null : '${client.firstName} ${client.lastName}'.trim();

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: Column(
        children: [
          DsAppBar(
            title: 'Rattacher une box',
            subtitle: _loadingProject
                ? 'Chargement du projet…'
                : (clientName == null ? _project?.name : 'Client : $clientName'),
            backLabel: 'Retour au projet',
            onBack: () => context.goToProjectDetail(widget.projectId),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(DsSpacing.s4),
              children: [
                if (_claimed != null)
                  _ClaimedCard(
                    box: _claimed!,
                    clientName: clientName,
                    onBack: () => context.goToProjectDetail(widget.projectId),
                  )
                else ...[
                  _ScannerCard(onDetect: _onDetect),
                  const SizedBox(height: DsSpacing.gapCard),
                  _ManualCard(
                    controller: _codeController,
                    submitting: _submitting,
                    onSubmit: () => _submit(_codeController.text),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ScannerCard extends StatelessWidget {
  const _ScannerCard({required this.onDetect});

  final void Function(BarcodeCapture) onDetect;

  @override
  Widget build(BuildContext context) {
    return DsCard(
      large: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const DsSectionTitle('Scanner le QR affiché sur la box'),
          const SizedBox(height: DsSpacing.s3),
          ClipRRect(
            borderRadius: BorderRadius.circular(DsRadius.card),
            child: SizedBox(
              height: 280,
              child: MobileScanner(onDetect: onDetect),
            ),
          ),
          const SizedBox(height: DsSpacing.s3),
          Text(
            'La box doit être allumée et connectée à Internet : elle s’annonce toute seule.',
            style: TextStyle(
              fontSize: context.dsType.captionSize,
              color: context.ds.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ManualCard extends StatelessWidget {
  const _ManualCard({
    required this.controller,
    required this.submitting,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool submitting;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return DsCard(
      large: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const DsSectionTitle('Ou recopier le code'),
          const SizedBox(height: DsSpacing.s3),
          DsTextField(
            label: 'Code affiché sous le QR',
            controller: controller,
            hintText: 'ABCD-EFGH-JKMN-PQRS-TVWX',
            helperText: 'Majuscules, tirets et O/0 sans importance.',
            textInputAction: TextInputAction.done,
            enabled: !submitting,
          ),
          const SizedBox(height: DsSpacing.s4),
          DsButton(
            label: 'Rattacher la box',
            icon: DsGlyph.qr,
            size: DsButtonSize.large,
            fullWidth: true,
            loading: submitting,
            onPressed: submitting ? null : onSubmit,
          ),
        ],
      ),
    );
  }
}

class _ClaimedCard extends StatelessWidget {
  const _ClaimedCard({
    required this.box,
    required this.clientName,
    required this.onBack,
  });

  final ClaimedBox box;
  final String? clientName;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return DsCard(
      large: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(DsGlyph.checkCircle, color: ds.success, size: 48),
          const SizedBox(height: DsSpacing.s3),
          Text(
            'Box …${box.tokenSuffix} rattachée${clientName == null ? '' : ' à $clientName'}',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: context.dsType.titleSize,
              fontWeight: FontWeight.w700,
              color: ds.textPrimary,
            ),
          ),
          const SizedBox(height: DsSpacing.s2),
          Text(
            'Elle reçoit sa clé dans la minute et passe sur l’écran de statut. '
            'Rien à faire sur la box.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: context.dsType.captionSize,
              color: ds.textSecondary,
            ),
          ),
          const SizedBox(height: DsSpacing.s4),
          DsButton(
            label: 'Retour au projet',
            icon: DsGlyph.back,
            fullWidth: true,
            onPressed: onBack,
          ),
        ],
      ),
    );
  }
}
