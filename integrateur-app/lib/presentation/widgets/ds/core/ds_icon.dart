import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';

/// Glyphes du Design System.
///
/// Le systeme source charge Material Symbols Rounded ; en Flutter, l'equivalent
/// livre avec le framework est la variante `rounded` des Material Icons.
/// Toutes les icones de l'app passent par ici : la substitution reste
/// remplacable en un seul endroit (cf. readme du DS, section « Iconographie »).
abstract final class DsGlyph {
  // Navigation.
  static const IconData dashboard = Icons.space_dashboard_rounded;
  static const IconData dashboardOutline = Icons.space_dashboard_outlined;
  static const IconData folder = Icons.folder_rounded;
  static const IconData folderOutline = Icons.folder_outlined;
  static const IconData event = Icons.event_rounded;
  static const IconData eventOutline = Icons.event_outlined;
  static const IconData today = Icons.today_rounded;
  static const IconData catalogue = Icons.inventory_2_rounded;
  static const IconData catalogueOutline = Icons.inventory_2_outlined;
  static const IconData home = Icons.home_rounded;
  static const IconData homeOutline = Icons.home_outlined;
  static const IconData support = Icons.support_agent_rounded;
  static const IconData more = Icons.more_horiz_rounded;
  static const IconData back = Icons.arrow_back_rounded;
  static const IconData chevronRight = Icons.chevron_right_rounded;
  static const IconData close = Icons.close_rounded;
  static const IconData settings = Icons.settings_rounded;
  static const IconData account = Icons.account_circle_rounded;

  // Metier.
  static const IconData checklist = Icons.checklist_rounded;
  static const IconData photo = Icons.photo_camera_rounded;
  static const IconData photoLibrary = Icons.photo_library_rounded;
  static const IconData notes = Icons.notes_rounded;
  static const IconData plan = Icons.square_foot_rounded;
  static const IconData quote = Icons.request_quote_rounded;
  static const IconData signature = Icons.draw_rounded;
  static const IconData room = Icons.meeting_room_rounded;
  static const IconData audit = Icons.assignment_rounded;
  static const IconData install = Icons.build_rounded;
  static const IconData engineering = Icons.engineering_rounded;
  static const IconData receipt = Icons.receipt_long_rounded;
  static const IconData client = Icons.person_rounded;
  static const IconData phone = Icons.phone_rounded;
  static const IconData mail = Icons.mail_rounded;
  static const IconData directions = Icons.directions_rounded;
  static const IconData location = Icons.location_on_rounded;
  static const IconData surface = Icons.crop_free_rounded;

  // Scan / mesure.
  static const IconData scan3d = Icons.view_in_ar_rounded;
  static const IconData qr = Icons.qr_code_2_rounded;
  static const IconData ruler = Icons.straighten_rounded;
  static const IconData sensors = Icons.sensors_rounded;

  // Domotique.
  static const IconData light = Icons.lightbulb_rounded;
  static const IconData blinds = Icons.blinds_rounded;
  static const IconData thermostat = Icons.thermostat_rounded;
  static const IconData security = Icons.security_rounded;
  static const IconData camera = Icons.videocam_rounded;
  static const IconData lock = Icons.lock_rounded;
  static const IconData fan = Icons.mode_fan_off_rounded;
  static const IconData media = Icons.speaker_rounded;
  static const IconData scene = Icons.auto_awesome_rounded;
  static const IconData sensor = Icons.settings_remote_rounded;
  static const IconData switchDevice = Icons.toggle_on_rounded;
  static const IconData network = Icons.wifi_rounded;
  static const IconData power = Icons.bolt_rounded;

  // Synchronisation.
  static const IconData cloudDone = Icons.cloud_done_rounded;
  static const IconData cloudOff = Icons.cloud_off_rounded;
  static const IconData cloudUpload = Icons.cloud_upload_rounded;
  static const IconData sync = Icons.sync_rounded;
  static const IconData syncProblem = Icons.sync_problem_rounded;

  // Etats / statuts.
  static const IconData editNote = Icons.edit_note_rounded;
  static const IconData pending = Icons.pending_rounded;
  static const IconData checkCircle = Icons.check_circle_rounded;
  static const IconData check = Icons.check_rounded;
  static const IconData archive = Icons.inventory_rounded;
  static const IconData send = Icons.send_rounded;
  static const IconData taskAlt = Icons.task_alt_rounded;
  static const IconData cancel = Icons.cancel_rounded;
  static const IconData schedule = Icons.schedule_rounded;
  static const IconData fiberNew = Icons.fiber_new_rounded;
  static const IconData folderOpen = Icons.folder_open_rounded;
  static const IconData hourglassTop = Icons.hourglass_top_rounded;
  static const IconData hourglassBottom = Icons.hourglass_bottom_rounded;
  static const IconData trendingUp = Icons.trending_up_rounded;
  static const IconData help = Icons.help_rounded;
  static const IconData eventAvailable = Icons.event_available_rounded;
  static const IconData eventBusy = Icons.event_busy_rounded;
  static const IconData personOff = Icons.person_off_rounded;
  static const IconData warning = Icons.warning_amber_rounded;
  static const IconData error = Icons.error_outline_rounded;
  static const IconData info = Icons.info_outline_rounded;
  static const IconData ai = Icons.auto_awesome_rounded;

  // Actions.
  static const IconData add = Icons.add_rounded;
  static const IconData remove = Icons.remove_rounded;
  static const IconData delete = Icons.delete_rounded;
  static const IconData edit = Icons.edit_rounded;
  static const IconData search = Icons.search_rounded;
  static const IconData filter = Icons.tune_rounded;
  static const IconData refresh = Icons.refresh_rounded;
  static const IconData favorite = Icons.favorite_rounded;
  static const IconData favoriteOutline = Icons.favorite_border_rounded;
  static const IconData visibility = Icons.visibility_rounded;
  static const IconData visibilityOff = Icons.visibility_off_rounded;
  static const IconData print = Icons.picture_as_pdf_rounded;
  static const IconData share = Icons.ios_share_rounded;
  static const IconData note = Icons.sticky_note_2_rounded;
  static const IconData inbox = Icons.inbox_rounded;
  static const IconData exitClientMode = Icons.lock_open_rounded;
}

/// Icone du DS. Taille par defaut 24 (20 en ligne dense, 22 dans un bouton-icone).
class DsIcon extends StatelessWidget {
  const DsIcon(
    this.icon, {
    this.size = 24,
    this.color,
    this.semanticLabel,
    super.key,
  });

  final IconData icon;
  final double size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) => Icon(
        icon,
        size: size,
        color: color ?? context.ds.textSecondary,
        semanticLabel: semanticLabel,
      );
}
