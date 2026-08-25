# evoX Toolkit

evoX **T1 (trusted-node)** yerel geliştirme plugini. Ayrı bir Node process olarak çalışır ve 12 aksiyon sunar.

> ⚠️ **T1 sandbox DEĞİLDİR.** Bu plugin Windows kullanıcı hesabınızın erişebildiği dosya/ağ/uygulamalara erişebilir (ör. panoya, hotspot kayıtlarına, Spotify hesabınıza). Yalnız kaynağını bildiğiniz kodu çalıştırın.

## Aksiyonlar

| Aksiyon | Açıklama | Controllers |
|---|---|---|
| Sayaç | Tuşa her basışta sayacı artırır, ekranda gösterir | Keypad |
| Hava | wttr.in tabanlı hava durumu ve sıcaklık gösterir | Keypad |
| CPU | CPU sıcaklık + kullanım, büyük alt alta | Keypad |
| GPU | GPU sıcaklık + kullanım, büyük alt alta | Keypad |
| RAM | Kullanılan/toplam RAM (örn. `12.9/32GB`) | Keypad |
| Disk | Sürücü boş alanı (örn. `C: 166GB`), sürücüler arası döner | Keypad |
| Hotkey | Sistem kısayolunu (kombinasyon) tetikler | Keypad |
| Metin Yaz | Metni yazar veya panoya kopyalayıp yapıştırır | Keypad |
| Pano | Panodan kopyalar veya panodaki metni yapıştırır | Keypad |
| URL Aç | HTTP/HTTPS adresi varsayılan tarayıcıda açar | Keypad |
| Spotify | Spotify çal/durdur, sonraki/önceki, beğen, sessiz | Keypad |
| Spotify Ses | Spotify ses seviyesini Knob ile kontrol eder | Knob, Keypad |

## Kurulum

```bash
npm install
```

Bağımlılıklar: `@evoxapp/plugin-sdk`, `systeminformation`, `sharp`.

## evoX'e yükleme

1. evoX masaüstü uygulamasını açın.
2. **Eklentiler → Geliştirici** butonuna tıklayın.
3. **Proje seç** ile bu klasörü (evox-toolkit) seçin.
4. Risk metnini okuyup **güven** verin ve plugini **başlatın**.
5. **Tuşlar** ekranında aksiyon kitaplığından istediğiniz aksiyonu bir tuşa atayın.

Kod değişikliğinden sonra Geliştirici penceresinden **yeniden yükle** kullanın. Logları aynı pencereden görebilirsiniz.

## Aksiyon bazlı kurulum notları

- **Hava**: Aksiyon ayarlarında **Şehir** alanı zorunludur; tuşta sıcaklık (üstte) ve nem yüzdesi (altta) büyük gösterilir.
- **Sistem panelleri (CPU/GPU/RAM/Disk)**: Aksiyon ayarlarındaki **Güncelleme (sn)** alanıyla panel yenileme aralığını seçebilirsiniz (varsayılan 3 sn). Paneller tuş üzerinde **büyük iki satır görsel** olarak çizilir (v1.2+). CPU sıcaklığı [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor)'dan okunur: LHM'i çalıştırın → **Options → Remote Web Server** açın → CPU aksiyonunun veri adresi alanı `http://localhost:8085/data.json` ile dolu gelir (boşsa otomatik denenir). GPU önce `nvidia-smi`, yoksa si.graphics(), yoksa LHM kullanılır.
- **Hotkey**: Aksiyon ayarına kısayolu elle yazın — ör. `Ctrl+Shift+D`, `Win+Shift+S`, `Alt+Tab`. Boş bırakırsanız eski sürümlerden kalma `preset`/`hotkey` değerleri ayarlanan kaydı varsa geçerli olur.
- **Spotify / Spotify Ses**: [developer.spotify.com](https://developer.spotify.com) üzerinden uygulama oluşturup Client ID, Client Secret ve Refresh Token'ı aksiyon ayarlarındaki **metin** alanlarına girin. Sahip olduğun taze **Access Token**'ı da yedek alanına yapıştırabilirsin (1 saat geçerli; refresh olmadan da çalışır). Ayarlar bir aksiyona kaydedilmezse plugin-geneli ayarlar denenir. **Spotify Ses** aksiyonunu bir Knob'a atayarak ses seviyesini kontrol edebilirsiniz. Sorun durumunda Geliştirici penceresinden `[spotify]` log satırını inceleyin (durum kodu + ayar anahtarları + alan dolu/boş bilgisi verir).
- **URL Aç**: Adres alanı zorunludur; yalnızca `http`/`https` protokolleri kabul edilir.

## Sorun giderme

| Sorun | Ne yapmalı |
|---|---|
| Plugin başlatılamıyor | Geliştirici penceresinden logları açın; `npm install` yapıldığından emin olun. |
| Aksiyon görünmüyor | Aksiyonun desteklediği controllers (`Keypad`/`Knob`) tuşunuzla uyumlu mu kontrol edin. |
| Handshake timeout | `runtime.mjs` içinde `client.start()` çağrılıyor mu; node_modules kurulu mu kontrol edin. |
