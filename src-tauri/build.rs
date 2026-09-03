use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{imageops::FilterType, DynamicImage, GenericImageView, Rgba, RgbaImage};
use std::{fs, io::BufWriter, path::Path};

const SIZE: u32 = 256;
const BRAND_FILE: &str = "../src/lib/brand.ts";
const DATA_PREFIX: &str = "data:image/jpeg;base64,";

fn receipt_logo() -> DynamicImage {
    let source = fs::read_to_string(BRAND_FILE).expect("read EFC brand logo");
    let start = source.find(DATA_PREFIX).expect("find EFC receipt logo") + DATA_PREFIX.len();
    let encoded = source[start..]
        .split('\'')
        .next()
        .expect("extract EFC receipt logo");
    let bytes = STANDARD.decode(encoded).expect("decode EFC receipt logo");
    image::load_from_memory_with_format(&bytes, image::ImageFormat::Jpeg)
        .expect("decode EFC receipt logo image")
}

fn square_icon(logo: &DynamicImage, size: u32) -> RgbaImage {
    let mut canvas = RgbaImage::from_pixel(size, size, Rgba([255, 255, 255, 255]));
    let (width, height) = logo.dimensions();
    let max_side = (size as f32 * 0.84) as u32;
    let scale = (max_side as f32 / width as f32).min(max_side as f32 / height as f32);
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

fn write_png(path: &Path, rgba: &RgbaImage) {
    rgba.save(path).expect("write application PNG icon");
}

fn write_ico(path: &Path, logo: &DynamicImage) {
    let mut directory = ico::IconDir::new(ico::ResourceType::Icon);
    for size in [16_u32, 24, 32, 48, 64, 128, 256] {
        let rgba = square_icon(logo, size);
        let image = ico::IconImage::from_rgba_data(size, size, rgba.into_raw());
        directory.add_entry(ico::IconDirEntry::encode(&image).expect("encode Windows icon"));
    }
    let file = fs::File::create(path).expect("create Windows icon");
    directory
        .write(BufWriter::new(file))
        .expect("write Windows icon");
}

fn main() {
    let icons = Path::new("icons");
    fs::create_dir_all(icons).expect("create generated icon directory");
    let logo = receipt_logo();
    let icon = square_icon(&logo, SIZE);
    write_png(&icons.join("icon.png"), &icon);
    write_ico(&icons.join("icon.ico"), &logo);
    println!("cargo:rerun-if-changed={BRAND_FILE}");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build();
}
