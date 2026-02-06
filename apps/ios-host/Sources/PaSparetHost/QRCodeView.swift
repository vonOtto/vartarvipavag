import SwiftUI
import CoreImage

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Renders a QR code for the given URL using CIQRCodeGenerator.
struct QRCodeView: View {
    let url  : String
    let size : CGFloat

    var body: some View {
        if let image = Self.generate(url) {
            image
                .resizable()
                .interpolation(.none)
                .aspectRatio(1, contentMode: .fit)
                .frame(width: size, height: size)
        } else {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.2))
                .frame(width: size, height: size)
        }
    }

    private static func generate(_ string: String) -> Image? {
        guard let data = string.data(using: .utf8) else { return nil }

        let filter = CIFilter(name: "CIQRCodeGenerator")!
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")

        guard let ci = filter.outputImage else { return nil }

        let scaled = ci.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        let ctx    = CIContext()
        guard let cg = ctx.createCGImage(scaled, from: scaled.extent) else { return nil }

        #if canImport(UIKit)
        return Image(uiImage: UIImage(cgImage: cg))
        #elseif canImport(AppKit)
        let ns = NSImage()
        ns.addRepresentation(NSBitmapImageRep(cgImage: cg))
        return Image(nsImage: ns)
        #endif
    }
}
