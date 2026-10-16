# evoX Toolkit

evoX **T1 (trusted-node)** yerel geliştirme plugini. Ayrı bir Node process olarak çalışır ve 6 aksiyon sunar.

> CPU / GPU / RAM / Disk izleme v2.0.0 ile bu pluginden çıkarıldı; ayrı **evoX Kaynak İzleyici** (`evox-sysmon`) plugini bunları sunar.

> ⚠️ **T1 sandbox DEĞİLDİR.** Bu plugin Windows kullanıcı hesabınızın erişebildiği dosya/ağ/uygulamalara erişebilir. Yalnız kaynağını bildiğiniz kodu çalıştırın.

> ℹ️ **Yayın durumu:** Bu proje T1 (yerel geliştirme) hedeflidir. evoX Developer SDK'daki public executable plugin yükleme hattı şu an kapalıdır (`PLUGIN_UPLOAD_NOT_READY`). Bu repo kaynak paylaşımı içindir; evoX **Eklentiler → Geliştirici** penceresiyle kendi makinende çalıştırılır. Detay: evoX SDK "Dağıtım durumu" sayfası.

## Aksiyonlar

| Aksiyon | Açıklama | Controllers |
|---|---|---|
| Sayaç | Tuşa her basışta sayacı artırır, ekranda gösterir | Keypad |
| Hava | wttr.in tabanlı hava durumu ve sıcaklık gösterir | Keypad |
| Hotkey | Sistem kısayolunu (kombinasyon) tetikler; ayara elle yazılır | Keypad |
| Metin Yaz | Metni yazar veya panoya kopyalayıp yapıştırır | Keypad |
| Pano | Panodan kopyalar veya panodaki metni yapıştırır | Keypad |
| URL Aç | HTTP/HTTPS adresi varsayılan tarayıcıda açar | Keypad |

## Kurulum

```bash
npm install
npm test
```

Bağımlılıklar: `@evoxapp/plugin-sdk` 0.2.0 (manifestteki `sdkVersion` ile aynı olmalı; runtime değeri manifestten okur), `sharp`.

Host plugini `evoX.exe` ile fork eder ve **5 sn** içinde handshake bekler. Bu yüzden `runtime.mjs` yalnız hafif modülleri yükler: `sharp` ilk tuş çiziminde, PowerShell/SendInput katmanı (`src/windows.js`) ilk basışta yüklenir (`test/plugin.test.js` bunu denetler). Host hataları (`RATE_LIMITED`, `CONTEXT_EXPIRED`) süreci düşürmez; aynı hata dakikada bir kez loglanır. Host, 5 dk içinde 3'ten fazla çöken ya da dakikada 1 MiB'tan fazla log yazan plugini kapatır.

## evoX'e yükleme

1. evoX masaüstü uygulamasını açın.
2. **Eklentiler → Geliştirici** butonuna tıklayın.
3. **Proje seç** ile bu klasörü (evox-toolkit) seçin.
4. Risk metnini okuyup **güven** verin ve plugini **başlatın**.
5. **Tuşlar** ekranında aksiyon kitaplığından istediğiniz aksiyonu bir tuşa atayın.

Kod değişikliğinden sonra Geliştirici penceresinden **yeniden yükle** kullanın. Logları aynı pencereden görebilirsiniz.

## Aksiyon bazlı kurulum notları

- **Hava**: Aksiyon ayarlarında **Şehir** alanı zorunludur; tuşta sıcaklık (üstte) ve nem yüzdesi (altta) büyük gösterilir. **Yenileme (dk)** alanıyla güncelleme aralığı seçilir (varsayılan 30 dk); tuş basılınca anında yenilenir.
- **Hotkey**: Modifier **dropdown**'ından (Ctrl / Shift / Alt / Win ve komboları) seç, **Tuş** alanına basacağın tuşu yaz (`D`, `F5`, `Tab`); veya **Kısayol elle** alanına tam kombinasyon yaz (`Ctrl+Shift+D`). Host'un kendi kayıt alanından gelen değerler de otomatik denenir. Ayarlar hiç dönmüyorsa log `[hotkey] settings keys: ...` ile görünür.
- **URL Aç**: Adres alanı zorunludur; yalnızca `http`/`https` protokolleri kabul edilir.

## Sorun giderme

| Sorun | Ne yapmalı |
|---|---|
| Plugin başlatılamıyor | Geliştirici penceresinden logları açın; `npm install` yapıldığından emin olun. |
| Aksiyon görünmüyor | Aksiyonun desteklediği controllers (`Keypad`/`Knob`) tuşunuzla uyumlu mu kontrol edin. |
| Handshake timeout | `runtime.mjs` içinde `client.start()` çağrılıyor mu; node_modules kurulu mu kontrol edin. |
| "Tekrarlanan hatalar nedeniyle kapatıldı" | Host plugini kapatmış. Düzeltmeden sonra **Eklentiler** ekranından plugini yeniden etkinleştirin / yeniden yükleyin. |
