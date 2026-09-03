use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{imageops::FilterType, DynamicImage, GenericImageView, Rgba, RgbaImage};
use std::{fs, io::BufWriter, path::Path};

const EFC_LOGO_JPEG_BASE64: &str = "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";

fn square_icon(logo: &DynamicImage, size: u32) -> RgbaImage {
    let mut canvas = RgbaImage::from_pixel(size, size, Rgba([255, 255, 255, 255]));
    let (width, height) = logo.dimensions();
    let max_width = (size as f32 * 0.92).round() as u32;
    let max_height = (size as f32 * 0.82).round() as u32;
    let scale = (max_width as f32 / width as f32).min(max_height as f32 / height as f32);
    let target_width = (width as f32 * scale).round().max(1.0) as u32;
    let target_height = (height as f32 * scale).round().max(1.0) as u32;
    let resized = logo
        .resize_exact(target_width, target_height, FilterType::Lanczos3)
        .to_rgba8();
    let left = (size - target_width) / 2;
    let top = (size - target_height) / 2;
    image::imageops::overlay(&mut canvas, &resized, left.into(), top.into());
    canvas
}

fn write_windows_icon(path: &Path, logo: &DynamicImage) {
    let mut directory = ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16_u32, 24, 32, 48, 64, 128, 256] {
        let rgba = square_icon(logo, size);
        let image = ico::IconImage::from_rgba_data(size, size, rgba.into_raw());
        directory.add_entry(
            ico::IconDirEntry::encode(&image).expect("encode 32-bit RGBA Windows icon"),
        );
    }
    let file = fs::File::create(path).expect("create Windows icon");
    directory
        .write(BufWriter::new(file))
        .expect("write Windows icon");
}

fn main() {
    let bytes = STANDARD
        .decode(EFC_LOGO_JPEG_BASE64)
        .expect("decode EFC logo");
    let logo = image::load_from_memory_with_format(&bytes, image::ImageFormat::Jpeg)
        .expect("decode EFC JPEG logo");

    let icon_dir = Path::new("icons");
    fs::create_dir_all(icon_dir).expect("create icon directory");
    write_windows_icon(&icon_dir.join("icon.ico"), &logo);

    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build();
}
