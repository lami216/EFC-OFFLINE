use std::{fs, io::BufWriter, path::Path};

const SIZE: u32 = 256;

fn in_rounded_square(x: u32, y: u32, radius: i32) -> bool {
    let (x, y, max) = (x as i32, y as i32, SIZE as i32 - 1);
    let cx = if x < radius {
        radius
    } else if x > max - radius {
        max - radius
    } else {
        x
    };
    let cy = if y < radius {
        radius
    } else if y > max - radius {
        max - radius
    } else {
        y
    };
    (x - cx).pow(2) + (y - cy).pow(2) <= radius.pow(2)
}

fn paint_icon() -> Vec<u8> {
    let mut rgba = vec![0; (SIZE * SIZE * 4) as usize];
    for y in 0..SIZE {
        for x in 0..SIZE {
            let pixel = ((y * SIZE + x) * 4) as usize;
            let inside = in_rounded_square(x, y, 48);
            let white_mark = (57..=91).contains(&x) && (60..=196).contains(&y)
                || (57..=199).contains(&x) && (60..=90).contains(&y)
                || (57..=180).contains(&x) && (113..=143).contains(&y)
                || (57..=199).contains(&x) && (165..=196).contains(&y);
            let gold_dot = (x as i32 - 190).pow(2) + (y as i32 - 75).pow(2) <= 81;
            let color = if !inside {
                [0, 0, 0, 0]
            } else if gold_dot {
                [213, 166, 60, 255]
            } else if white_mark {
                [255, 255, 255, 255]
            } else {
                [7, 83, 66, 255]
            };
            rgba[pixel..pixel + 4].copy_from_slice(&color);
        }
    }
    rgba
}

fn write_png(path: &Path, rgba: &[u8]) {
    let file = fs::File::create(path).expect("create generated application PNG icon");
    let mut encoder = png::Encoder::new(BufWriter::new(file), SIZE, SIZE);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder
        .write_header()
        .expect("write PNG header")
        .write_image_data(rgba)
        .expect("write PNG pixels");
}

fn write_ico(path: &Path, rgba: &[u8]) {
    let image = ico::IconImage::from_rgba_data(SIZE, SIZE, rgba.to_vec());
    let mut directory = ico::IconDir::new(ico::ResourceType::Icon);
    directory.add_entry(ico::IconDirEntry::encode(&image).expect("encode Windows icon"));
    let file = fs::File::create(path).expect("create generated Windows icon");
    directory
        .write(BufWriter::new(file))
        .expect("write Windows icon");
}

fn main() {
    let icons = Path::new("icons");
    fs::create_dir_all(icons).expect("create generated icon directory");
    let rgba = paint_icon();
    write_png(&icons.join("icon.png"), &rgba);
    write_ico(&icons.join("icon.ico"), &rgba);
    println!("cargo:rerun-if-changed=icons/app-icon.svg");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build();
}
