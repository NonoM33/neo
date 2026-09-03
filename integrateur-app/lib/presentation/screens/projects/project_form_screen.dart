import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/di/providers.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/client.dart';
import '../../../domain/entities/project.dart';
import '../../blocs/projects/projects_event.dart';
import '../../blocs/projects/projects_state.dart';
import '../../widgets/ds/ds.dart';

const _uuid = Uuid();

/// Creation / modification d'un projet.
///
/// iPad paysage : **deux colonnes** (client a gauche, chantier a droite) avec
/// une barre d'action basse persistante. iPhone : sections empilees, clavier
/// gere, bouton d'enregistrement au-dessus du clavier.
/// Toute saisie modifiee est protegee par une confirmation d'abandon.
class ProjectFormScreen extends ConsumerStatefulWidget {
  const ProjectFormScreen({this.projectId, super.key});

  final String? projectId;

  bool get isEditing => projectId != null;

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _street = TextEditingController();
  final _postalCode = TextEditingController();
  final _city = TextEditingController();
  final _name = TextEditingController();
  final _surface = TextEditingController();
  final _notes = TextEditingController();

  Project? _existing;
  bool _dirty = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) {
      final state = ref.read(projectsBlocProvider).state;
      if (state is ProjectDetailLoaded &&
          state.project.id == widget.projectId) {
        _fill(state.project);
      } else {
        ref
            .read(projectsBlocProvider)
            .add(ProjectLoadRequested(widget.projectId!));
      }
    }
    for (final controller in _controllers) {
      controller.addListener(_markDirty);
    }
  }

  List<TextEditingController> get _controllers => [
        _firstName,
        _lastName,
        _email,
        _phone,
        _street,
        _postalCode,
        _city,
        _name,
        _surface,
        _notes,
      ];

  void _markDirty() {
    if (!_dirty) setState(() => _dirty = true);
  }

  void _fill(Project project) {
    _existing = project;
    _name.text = project.name;
    _surface.text = project.surface?.toString() ?? '';
    _notes.text = project.description ?? '';
    _street.text = project.address ?? '';
    _city.text = project.city ?? '';
    _postalCode.text = project.postalCode ?? '';
    final client = project.client;
    if (client != null) {
      _firstName.text = client.firstName;
      _lastName.text = client.lastName;
      _email.text = client.email ?? '';
      _phone.text = client.phone ?? '';
    }
    _dirty = false;
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller
        ..removeListener(_markDirty)
        ..dispose();
    }
    super.dispose();
  }

  Future<bool> _confirmLeave() async {
    if (!_dirty) return true;
    return showDsConfirmDialog(
      context,
      title: 'Abandonner les modifications ?',
      description:
          'Les informations saisies ne seront pas enregistrées sur cet appareil.',
      confirmLabel: 'Abandonner',
    );
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      showDsSnackbar(
        context,
        message: 'Vérifiez les champs signalés.',
        tone: DsTone.warning,
      );
      return;
    }

    setState(() => _saving = true);
    HapticFeedback.lightImpact();

    String? trimmed(TextEditingController controller) =>
        controller.text.trim().isEmpty ? null : controller.text.trim();

    final clientId = _existing?.clientId ?? _uuid.v4();
    final project = Project(
      id: widget.projectId ?? _uuid.v4(),
      name: _name.text.trim(),
      clientId: clientId,
      client: Client(
        id: clientId,
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        email: trimmed(_email),
        phone: trimmed(_phone),
        address: trimmed(_street),
        postalCode: trimmed(_postalCode),
        city: trimmed(_city),
      ),
      status: _existing?.status ?? ProjectStatus.brouillon,
      address: trimmed(_street),
      city: trimmed(_city),
      postalCode: trimmed(_postalCode),
      surface: _surface.text.trim().isEmpty
          ? null
          : double.tryParse(_surface.text.trim().replaceAll(',', '.')),
      description: trimmed(_notes),
      createdAt: _existing?.createdAt ?? DateTime.now(),
    );

    final bloc = ref.read(projectsBlocProvider);
    bloc.add(
      widget.isEditing
          ? ProjectUpdateRequested(project)
          : ProjectCreateRequested(project),
    );

    _dirty = false;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final device = context.dsDevice;
    final twoColumns = device.isTabletOrLarger && context.dsIsLandscape;

    final client = _Section(
      title: 'Client',
      children: [
        Row(
          children: [
            Expanded(
              child: DsTextField(
                label: 'Prénom',
                controller: _firstName,
                required: true,
                validator: (value) =>
                    Validators.required(value, fieldName: 'Prénom'),
              ),
            ),
            const SizedBox(width: DsSpacing.s3),
            Expanded(
              child: DsTextField(
                label: 'Nom',
                controller: _lastName,
                required: true,
                validator: (value) =>
                    Validators.required(value, fieldName: 'Nom'),
              ),
            ),
          ],
        ),
        DsTextField(
          label: 'Email',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          prefixIcon: DsGlyph.mail,
        ),
        DsTextField(
          label: 'Téléphone',
          controller: _phone,
          keyboardType: TextInputType.phone,
          prefixIcon: DsGlyph.phone,
        ),
      ],
    );

    final site = _Section(
      title: 'Chantier',
      children: [
        DsTextField(
          label: 'Nom du projet',
          controller: _name,
          hintText: 'Maison Lefèvre, Appartement Rivoli…',
          required: true,
          validator: (value) =>
              Validators.required(value, fieldName: 'Nom du projet'),
        ),
        DsTextField(
          label: 'Adresse',
          controller: _street,
          prefixIcon: DsGlyph.location,
        ),
        Row(
          children: [
            SizedBox(
              width: 140,
              child: DsTextField(
                label: 'Code postal',
                controller: _postalCode,
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: DsSpacing.s3),
            Expanded(
              child: DsTextField(label: 'Ville', controller: _city),
            ),
          ],
        ),
        DsTextField(
          label: 'Surface (m²)',
          controller: _surface,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          prefixIcon: DsGlyph.surface,
          validator: (value) =>
              Validators.positiveNumber(value, fieldName: 'Surface'),
        ),
        DsTextField(
          label: 'Notes',
          controller: _notes,
          hintText: 'Contraintes d’accès, attentes du client…',
          maxLines: 4,
          minLines: 3,
          textInputAction: TextInputAction.newline,
        ),
      ],
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmLeave() && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: ds.surfaceBase,
        appBar: DsAppBar(
          title: widget.isEditing ? 'Modifier le projet' : 'Nouveau projet',
          subtitle: widget.isEditing ? _existing?.name : 'Client et chantier',
          backLabel: 'Annuler',
          onBack: () async {
            if (await _confirmLeave() && context.mounted) {
              Navigator.of(context).pop();
            }
          },
        ),
        body: Form(
          key: _formKey,
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: DsSpacing.page(device),
                  child: twoColumns
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: client),
                            const SizedBox(width: DsSpacing.gapSection),
                            Expanded(child: site),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            client,
                            const SizedBox(height: DsSpacing.gapSection),
                            site,
                          ],
                        ),
                ),
              ),
              // Barre d'action persistante : le submit ne vit pas uniquement
              // dans l'app bar, loin du dernier champ.
              Container(
                padding: EdgeInsets.all(DsSpacing.pagePadding(device)),
                decoration: BoxDecoration(
                  color: ds.surface1,
                  border: Border(top: BorderSide(color: ds.borderDefault)),
                  boxShadow: ds.elevationSticky,
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Expanded(
                        child: DsButton(
                          label: 'Annuler',
                          variant: DsButtonVariant.ghost,
                          fullWidth: true,
                          onPressed: () async {
                            if (await _confirmLeave() && context.mounted) {
                              Navigator.of(context).pop();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: DsSpacing.s3),
                      Expanded(
                        flex: 2,
                        child: DsButton(
                          label: widget.isEditing
                              ? 'Enregistrer les modifications'
                              : 'Créer le projet',
                          icon: DsGlyph.checkCircle,
                          size: DsButtonSize.large,
                          fullWidth: true,
                          loading: _saving,
                          onPressed: _submit,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        DsSectionTitle(title),
        const SizedBox(height: DsSpacing.s3),
        DsCard(
          large: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const SizedBox(height: DsSpacing.s4),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}
