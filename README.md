# Centre EFC

تطبيق سطح مكتب عربي لإدارة التسجيلات والدورات والدفعات في مراكز التدريب. يعمل محلياً دون خادم، ويجمع واجهة React RTL مع أوامر Rust typed وقاعدة SQLite آمنة.

## المزايا

- إعداد أول تشغيل وحساب مدير بكلمة مرور Argon2 بلا كلمة مرور افتراضية.
- فروع وتخصصات مرنة، تسعير دفعة واحدة أو شهري، وتسلسل سجل مستقل لكل فرع وتخصص.
- معاملة تسجيل ذرية تنشئ الطالب والتسجيل والأقساط والدفعة وتخصيصاتها والوصل والتدقيق أو تتراجع بالكامل.
- وصول PDF عربية عبر التقاط WebView عالي الدقة، سجل يومي وتقارير مالية تستبعد الدفعات الملغاة.
- قاعدة بيانات في مجلد بيانات التطبيق، WAL وforeign keys وbusy timeout، وترحيلات غير مدمرة.

## المعمارية

الواجهة في `src/`، والحدود المحلية في `src/lib/api.ts`. لا تنفذ الواجهة SQL. طبقة Rust في `src-tauri/src/` موزعة إلى أوامر ونماذج وخدمات وقاعدة بيانات وأخطاء. راجع [ARCHITECTURE.md](ARCHITECTURE.md).

## متطلبات التطوير

Node.js 22 LTS، Rust stable، ومتطلبات Tauri 2 للنظام. على Windows يلزم Visual Studio C++ Build Tools وWebView2 للبناء فقط؛ المستخدم النهائي لا يحتاجها. ثبّت الحزم بـ `npm ci`.

```bash
npm run tauri dev
npm run lint && npm run typecheck && npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
npm run tauri build -- --bundles nsis
```

## البيانات والنسخ الاحتياطي

توجد `centre-efc.sqlite` في مجلد application data الخاص بالمعرّف `mr.efc.centre` (عادة `%APPDATA%` على Windows). يستخدم النسخ الاحتياطي `VACUUM INTO` بدلاً من نسخ ملف WAL النشط. لا تضع قاعدة الإنتاج بجوار الملف التنفيذي.

## Windows Setup

ينشئ البناء `src-tauri/target/release/bundle/nsis/Centre EFC_0.1.0_x64-setup.exe` (قد تختلف شرطة الاسم حسب إصدار bundler). يتضمن NSIS مثبت WebView2 offline. في GitHub افتح **Actions → Windows installer → Artifacts** ونزّل `EFC-Windows-Setup`؛ يحتوي artifact على Setup.exe الحقيقي.

لا يحتوي المستودع على ملفات أيقونات ثنائية. المصدر القابل للمراجعة هو
`src-tauri/icons/app-icon.svg`، ويولّد `build.rs` ملفات PNG وICO المطلوبة مؤقتاً
أثناء البناء. لذلك تعمل حزمة Windows النظيفة دون الحاجة إلى تخزين ملفات ثنائية في Git.

المثبت غير موقّع افتراضياً وقد يعرض Windows SmartScreen تحذيراً. يمكن إضافة شهادة Authenticode لاحقاً عبر أسرار release دون تغيير التطبيق.

## الإصدارات

حدّث الإصدار نفسه في `package.json` و`src-tauri/Cargo.toml` و`src-tauri/tauri.conf.json`، حدّث lockfiles، ثم أنشئ tag مثل `v0.1.1`. كل push إلى `main` وtag `v*` وworkflow يدوي يبني artifact مستقل.
