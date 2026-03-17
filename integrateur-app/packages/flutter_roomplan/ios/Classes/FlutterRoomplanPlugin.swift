import Flutter
import UIKit
import QuickLook

public class FlutterRoomplanPlugin: NSObject, FlutterPlugin, QLPreviewControllerDataSource {
  private var previewURL: URL?
  private static var channel: FlutterMethodChannel?
  private static weak var presentedRoomVC: RoomCaptureViewController?
  private static weak var flutterEngine: FlutterEngine?

  public static func register(with registrar: FlutterPluginRegistrar) {
    let ch = FlutterMethodChannel(name: "rkg/flutter_roomplan", binaryMessenger: registrar.messenger())
    channel = ch

    // The registrar's messenger IS the FlutterEngine
    if let engine = registrar.messenger() as? FlutterEngine {
      flutterEngine = engine
    }

    let instance = FlutterRoomplanPlugin()
    registrar.addMethodCallDelegate(instance, channel: ch)
  }

  /// Shared channel so RoomCaptureViewController can call back into Flutter
  static var sharedChannel: FlutterMethodChannel? { channel }

  /// Get the FlutterViewController to present from
  private func getPresenter() -> UIViewController? {
    // Primary: use the FlutterEngine's viewController
    var vc: UIViewController? = FlutterRoomplanPlugin.flutterEngine?.viewController

    // Fallback: try connected scenes
    if vc == nil {
      for scene in UIApplication.shared.connectedScenes {
        guard let ws = scene as? UIWindowScene else { continue }
        if #available(iOS 15.0, *), let kw = ws.keyWindow {
          vc = kw.rootViewController
          break
        }
        if let w = ws.windows.first(where: { $0.rootViewController != nil }) {
          vc = w.rootViewController
          break
        }
      }
    }

    // Walk to topmost presented VC
    var top = vc
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "startScan":
        let arguments = call.arguments as? [String: Any]
        let enableMultiRoom = arguments?["enableMultiRoom"] as? Bool ?? false

        let finalEnableMultiRoom: Bool
        if #available(iOS 17.0, *) {
            finalEnableMultiRoom = enableMultiRoom
        } else {
            finalEnableMultiRoom = false
        }

        // Method channel calls are already on main thread — no need for async dispatch
        guard let presenter = getPresenter() else {
          print("[FlutterRoomplan] ERROR: No view controller found to present from")
          print("[FlutterRoomplan] Engine: \(String(describing: FlutterRoomplanPlugin.flutterEngine))")
          print("[FlutterRoomplan] Engine VC: \(String(describing: FlutterRoomplanPlugin.flutterEngine?.viewController))")
          print("[FlutterRoomplan] Connected scenes: \(UIApplication.shared.connectedScenes.count)")
          result(nil)
          return
        }

        print("[FlutterRoomplan] Presenting from: \(type(of: presenter))")
        let roomVC = RoomCaptureViewController()
        roomVC.isMultiRoomModeEnabled = finalEnableMultiRoom
        roomVC.modalPresentationStyle = .fullScreen
        FlutterRoomplanPlugin.presentedRoomVC = roomVC
        presenter.present(roomVC, animated: true, completion: nil)
        result(nil)

    case "isSupported":
      result(RoomCaptureViewController.isSupported())
    case "isMultiRoomSupported":
        if #available(iOS 17.0, *) {
            result(RoomCaptureViewController.isSupported())
        } else {
            result(false)
        }
    case "getUsdzFilePath":
      if let roomVC = FlutterRoomplanPlugin.presentedRoomVC {
        result(roomVC.usdzFilePath)
      } else {
        result(FlutterError(code: "NO_SCAN", message: "No active room scan found", details: nil))
      }
    case "getJsonFilePath":
      if let roomVC = FlutterRoomplanPlugin.presentedRoomVC {
        result(roomVC.jsonFilePath)
      } else {
        result(FlutterError(code: "NO_SCAN", message: "No active room scan found", details: nil))
      }
    case "previewUsdz":
        let args = call.arguments as? [String: Any]
        guard let filePath = args?["filePath"] as? String else {
          result(FlutterError(code: "INVALID_ARGS", message: "filePath required", details: nil))
          return
        }

        let fileURL = URL(fileURLWithPath: filePath)
        guard FileManager.default.fileExists(atPath: filePath) else {
          result(FlutterError(code: "FILE_NOT_FOUND", message: "USDZ file not found", details: nil))
          return
        }

        previewURL = fileURL
        let qlController = QLPreviewController()
        qlController.dataSource = self

        if let presenter = getPresenter() {
          presenter.present(qlController, animated: true, completion: nil)
        }
        result(nil)

    default:
      result(FlutterMethodNotImplemented)
    }
  }

  // MARK: - QLPreviewControllerDataSource

  public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    return previewURL != nil ? 1 : 0
  }

  public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    return previewURL! as NSURL
  }
}
