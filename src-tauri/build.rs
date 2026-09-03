use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{imageops::FilterType, DynamicImage, GenericImageView, Rgba, RgbaImage};
use std::{fs, io::BufWriter, path::Path};

const EFC_LOGO_JPEG_BASE64: &str = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=";

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
