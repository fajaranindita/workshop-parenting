/* Helper bersama untuk semua halaman */
(function () {
  'use strict';

  var LABEL_STATUS = {
    menunggu_bayar: 'Menunggu pembayaran',
    menunggu_verifikasi: 'Menunggu verifikasi',
    lunas: 'Lunas',
    hadir: 'Hadir',
    ditolak: 'Bukti ditolak',
    kedaluwarsa: 'Kedaluwarsa',
    batal: 'Dibatalkan'
  };

  function api(aksi, data) {
    if (!window.API_URL || window.API_URL.indexOf('PASTE_') === 0) {
      return Promise.reject(new Error('API_URL belum diisi di config.js'));
    }
    var body = Object.assign({ aksi: aksi }, data || {});
    // Panitia yang login di dashboard (browser yang sama) tetap bisa uji coba saat mode pemeliharaan
    if (!body.sesi) { var su = ambil('ws_sesi'); if (su) body.sesi_uji = su; }
    var coba = 0;
    function kirim() {
      coba++;
      return fetch(window.API_URL, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(function (err) {
          // Coba ulang otomatis untuk gangguan jaringan (maks 3x)
          if (coba < 3) return new Promise(function (r) { setTimeout(r, 800 * coba); }).then(kirim);
          throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
        });
    }
    return kirim().then(function (json) {
      if (aksi === 'publik' && json.ok) aturPemeliharaan(json.pemeliharaan, json.acara);
      if (!json.ok && json.kode_error === 'PEMELIHARAAN') aturPemeliharaan({ pesan: json.error }, null);
      if (!json.ok) {
        var e = new Error(json.error || 'Terjadi kesalahan.');
        e.kode = json.kode_error;
        throw e;
      }
      return json;
    });
  }

  // ---------- Mode pemeliharaan ----------
  var cekUlangPemeliharaan = null;
  function aturPemeliharaan(info, acara) {
    var layar = document.getElementById('layarPemeliharaan');
    if (!info) { // pemeliharaan selesai
      if (layar) location.reload();
      var bu = document.getElementById('bannerUjiPemeliharaan'); if (bu) bu.remove();
      return;
    }
    if (info.uji) {
      if (!document.getElementById('bannerUjiPemeliharaan')) {
        var b = document.createElement('div'); b.id = 'bannerUjiPemeliharaan'; b.className = 'banner-uji-pemeliharaan';
        b.textContent = 'Mode pemeliharaan aktif. Anda bisa melihat dan memakai halaman ini karena sedang login sebagai panitia di browser ini.';
        document.body.insertBefore(b, document.body.firstChild);
      }
      return;
    }
    if (!layar) {
      layar = document.createElement('div'); layar.id = 'layarPemeliharaan'; layar.className = 'layar-pemeliharaan';
      layar.setAttribute('role', 'alertdialog'); layar.setAttribute('aria-labelledby', 'judulPemeliharaan');
      layar.innerHTML = '<div class="kartu-pemeliharaan"><div class="ikon-pemeliharaan"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"></path></svg></div>' +
        '<h1 id="judulPemeliharaan">Sedang ada pembaruan</h1><p id="pesanPemeliharaan"></p>' +
        '<p class="hint">Halaman ini akan terbuka sendiri setelah pembaruan selesai.</p>' +
        '<div class="btn-grup" style="justify-content:center"><button type="button" class="btn" id="cobaPemeliharaan">Coba lagi</button><span id="kontakPemeliharaan"></span></div></div>';
      document.body.appendChild(layar);
      document.documentElement.classList.add('sedang-pemeliharaan');
      layar.querySelector('#cobaPemeliharaan').addEventListener('click', function () { location.reload(); });
    }
    layar.querySelector('#pesanPemeliharaan').textContent = info.pesan || '';
    if (acara && acara.kontak_wa) layar.querySelector('#kontakPemeliharaan').innerHTML = '<a class="btn sekunder" target="_blank" rel="noopener" href="' + esc(linkWA(acara.kontak_wa, 'Halo panitia, saya ingin bertanya. ')) + '">Hubungi panitia via WA</a>';
    if (!cekUlangPemeliharaan) cekUlangPemeliharaan = setInterval(function () { api('publik').catch(function () { }); }, 30000);
    if (!acara) api('publik').catch(function () { }); // ambil kontak panitia
  }

  function rupiah(n) {
    return 'Rp' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /** 'YYYY-MM-DDTHH:mm' (WIB) atau ISO → Date */
  function keDate(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    var str = String(s);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T00:00:00+07:00';
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) str += ':00+07:00';
    var d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtTanggal(s, opsi) {
    var d = keDate(s);
    if (!d) return '-';
    var o = Object.assign({ timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, opsi || {});
    return new Intl.DateTimeFormat('id-ID', o).format(d);
  }
  function fmtJam(s) {
    var d = keDate(s);
    if (!d) return '';
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(d).replace('.', ':') + ' WIB';
  }
  function fmtWaktu(s) {
    var d = keDate(s);
    if (!d) return '-';
    return fmtTanggal(d, { weekday: undefined, month: 'short' }) + ', ' + fmtJam(d);
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function param(nama) { return new URLSearchParams(location.search).get(nama) || ''; }

  function $(sel, akar) { return (akar || document).querySelector(sel); }
  function $$(sel, akar) { return Array.prototype.slice.call((akar || document).querySelectorAll(sel)); }

  var toastTimer;
  function toast(pesan, error) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = pesan;
    t.className = 'tampil' + (error ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, error ? 5000 : 2600);
  }

  function salin(teks) {
    var selesai = function () { toast('Disalin: ' + teks); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(teks)).then(selesai, function () { salinLama(teks); selesai(); });
    } else { salinLama(teks); selesai(); }
  }
  function salinLama(teks) {
    var ta = document.createElement('textarea');
    ta.value = teks; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
  }

  /**
   * Teks keterangan tiket dengan format sederhana yang aman:
   * <s>teks</s> atau ~~teks~~ → dicoret, **teks** → tebal. Kode HTML lain tetap tampil sebagai teks.
   */
  function formatKet(s) {
    return esc(s)
      .replace(/&lt;s&gt;([\s\S]+?)&lt;\/s&gt;/gi, '<s>$1</s>')
      .replace(/~~([^~]+?)~~/g, '<s>$1</s>')
      .replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
  }

  function badge(status) {
    return '<span class="badge st-' + esc(status) + '">' + esc(LABEL_STATUS[status] || status) + '</span>';
  }

  function halaman(nama, params) {
    var u = new URL(nama, location.href);
    u.search = '';
    Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
    return u.toString();
  }

  function linkWA(nomor, pesan) {
    return 'https://wa.me/' + String(nomor || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(pesan);
  }

  function simpan(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function ambil(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function hapus(k) { try { localStorage.removeItem(k); } catch (e) { } }

  /** Mengompres gambar menjadi JPEG (sisi terpanjang 1400px). PDF dikirim apa adanya. */
  var MAKS_BUKTI = 2.5 * 1024 * 1024;
  var JENIS_EKSTENSI = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf', heic: 'image/heic', heif: 'image/heif', webp: 'image/webp', gif: 'image/gif' };

  /** Jenis file; beberapa HP tidak mengisi file.type (mis. file dari chat WA/Drive), jadi ditebak dari nama file */
  function jenisFile(file) {
    var t = String(file.type || '').toLowerCase();
    if (t && t !== 'application/octet-stream') return t;
    var m = /\.([a-z0-9]+)$/i.exec(file.name || '');
    return m ? (JENIS_EKSTENSI[m[1].toLowerCase()] || '') : '';
  }

  function galatFile(kode, pesan, saran) { var e = new Error(pesan); e.kode = kode; e.saran = saran; return e; }
  var SARAN_SCREENSHOT = 'Coba kirim <b>screenshot</b> bukti transfer dari aplikasi bank (bukan foto kamera), lalu pilih dari Galeri.';

  var skripTermuat = {};
  function muatSkrip(src) {
    if (!skripTermuat[src]) skripTermuat[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.onload = resolve;
      s.onerror = function () { delete skripTermuat[src]; reject(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
    return skripTermuat[src];
  }

  /** Gambar → JPEG diperkecil (maks. 1400 px). Gagal jika browser tidak bisa membaca gambarnya. */
  function kompresGambar(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        var maks = 1400, w = img.naturalWidth, h = img.naturalHeight;
        var skala = Math.min(1, maks / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * skala); c.height = Math.round(h * skala);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL('image/jpeg', 0.75);
        if (dataUrl.length < 100) return reject(new Error('kanvas kosong'));
        resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1], pratinjau: dataUrl });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('tidak terbaca')); };
      img.src = url;
    });
  }

  function bacaBase64(file, mime) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve({ mime: mime, data: String(fr.result).split(',')[1], pratinjau: null, asli: true }); };
      fr.onerror = function () { reject(galatFile('BACA_FILE', 'File tidak bisa dibaca dari HP ini.', SARAN_SCREENSHOT)); };
      fr.readAsDataURL(file);
    });
  }

  /** Foto HEIC (iPhone/Samsung): Safari bisa membacanya langsung; browser lain memakai pengubah HEIC (dimuat hanya saat perlu) */
  function siapkanHeic(file, mime) {
    return kompresGambar(file).catch(function () {
      return muatSkrip('vendor/heic2any.min.js').then(function () {
        return window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      }).then(function (hasil) { return kompresGambar(Array.isArray(hasil) ? hasil[0] : hasil); });
    }).catch(function () {
      // Tidak bisa diubah di HP ini: kirim apa adanya, panitia tetap bisa membukanya
      if (file.size > MAKS_BUKTI) throw galatFile('UKURAN', 'Foto HEIC ini terlalu besar (' + (file.size / 1048576).toFixed(1) + ' MB) dan tidak bisa diperkecil di HP ini.', SARAN_SCREENSHOT);
      return bacaBase64(file, mime);
    });
  }

  function siapkanFile(file) {
    if (!file) return Promise.reject(galatFile('KOSONG', 'Pilih file terlebih dahulu.'));
    var tipe = jenisFile(file);
    if (!tipe) return Promise.reject(galatFile('FORMAT', 'Jenis file ini tidak dikenali.', 'Kalau bukti tersimpan di chat WhatsApp atau Google Drive, simpan dulu ke Galeri lalu pilih dari Galeri. Atau ' + SARAN_SCREENSHOT.charAt(0).toLowerCase() + SARAN_SCREENSHOT.slice(1)));
    if (tipe === 'application/pdf') {
      if (file.size > MAKS_BUKTI) return Promise.reject(galatFile('UKURAN', 'Ukuran PDF maksimal 2,5 MB (file ini ' + (file.size / 1048576).toFixed(1) + ' MB).', SARAN_SCREENSHOT));
      return bacaBase64(file, tipe).then(function (h) { h.asli = false; return h; });
    }
    if (tipe === 'image/heic' || tipe === 'image/heif') return siapkanHeic(file, tipe);
    if (!/^image\//.test(tipe)) return Promise.reject(galatFile('FORMAT', 'Format file harus gambar (JPG/PNG) atau PDF.', SARAN_SCREENSHOT));
    return kompresGambar(file).catch(function () {
      throw galatFile('BACA_GAMBAR', 'Gambar ini tidak bisa dibaca oleh browser Anda.', SARAN_SCREENSHOT);
    });
  }

  /** Ringkasan perangkat untuk laporan kendala (tanpa data pribadi) */
  function infoPerangkat() {
    var ua = navigator.userAgent || '';
    var os = /iPhone|iPad|iPod/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'Lainnya';
    var app = /Instagram/.test(ua) ? 'aplikasi Instagram' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'aplikasi Facebook' : /Line\//.test(ua) ? 'aplikasi LINE'
      : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /EdgA?\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'browser lain';
    return os + ' · ' + app;
  }
  function dalamAplikasi() { return /Instagram|FBAN|FBAV|FB_IAB|Line\//.test(navigator.userAgent || ''); }

  function hitungMundur(target, el, selesai) {
    var d = keDate(target);
    function tick() {
      var sisa = d - new Date();
      if (sisa <= 0) { el.textContent = 'waktu habis'; if (selesai) selesai(); return; }
      var j = Math.floor(sisa / 3600000), m = Math.floor(sisa % 3600000 / 60000), s = Math.floor(sisa % 60000 / 1000);
      el.textContent = j + ' jam ' + ('0' + m).slice(-2) + ' menit ' + ('0' + s).slice(-2) + ' detik';
      setTimeout(tick, 1000);
    }
    tick();
  }

  function memuat(teks) { return '<div class="memuat"><div class="spinner"></div>' + esc(teks || 'Memuat…') + '</div>'; }

  function csv(baris) {
    return baris.map(function (r) {
      return r.map(function (v) {
        var s = String(v === undefined || v === null ? '' : v);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
  }
  function unduh(namaFile, isi, mime) {
    var blob = new Blob(['﻿' + isi], { type: mime || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = namaFile;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /** Label & teks untuk anggota lain dalam satu tiket */
  function labelAnggota(orang) { return orang === 2 ? 'Pasangan' : 'Anggota grup'; }
  function teksAnggota(p) { return (p.anggota || []).join(', '); }
  var LABEL_JK = { L: 'Laki-laki', P: 'Perempuan' };
  /** Semua orang dalam satu tiket: [{nama, jk, peran}] — pendaftar lalu anggota */
  function daftarOrang(p) {
    var jk = p.jenis_kelamin || [];
    var out = [{ nama: p.nama, jk: jk[0] || '', peran: p.orang > 2 ? 'Penanggung jawab' : 'Pendaftar' }];
    for (var i = 0; i < Math.max(0, (p.orang || 1) - 1); i++) {
      out.push({ nama: (p.anggota || [])[i] || '', jk: jk[i + 1] || '', peran: p.orang === 2 ? 'Pasangan' : 'Anggota ' + (i + 2) });
    }
    return out;
  }
  /** Ringkasan jumlah per jenis kelamin, mis. "1 L · 1 P" */
  function ringkasJK(p) {
    var l = 0, pr = 0, x = 0;
    daftarOrang(p).forEach(function (o) { if (o.jk === 'L') l++; else if (o.jk === 'P') pr++; else x++; });
    return [l ? l + ' L' : '', pr ? pr + ' P' : '', x ? x + ' ?' : ''].filter(Boolean).join(' · ');
  }
  // Tulisan penanda tiket khusus (default VIP), diatur di Pengaturan Acara
  var labelVip = 'VIP';
  function setLabelVip(acara) { if (acara && acara.label_vip) labelVip = acara.label_vip; }
  function teksVip() { return labelVip; }
  function badgeVip(p) { return p && p.vip ? ' <span class="badge vip">' + esc(labelVip) + '</span>' : ''; }

  window.App = {
    VERSI: '2026.11.28.3', // naikkan bersama semua halaman setiap rilis

    api: api, rupiah: rupiah, keDate: keDate, fmtTanggal: fmtTanggal, fmtJam: fmtJam, fmtWaktu: fmtWaktu,
    esc: esc, formatKet: formatKet, param: param, $: $, $$: $$, toast: toast, salin: salin, badge: badge, LABEL_STATUS: LABEL_STATUS,
    halaman: halaman, linkWA: linkWA, simpan: simpan, ambil: ambil, hapus: hapus, siapkanFile: siapkanFile, jenisFile: jenisFile,
    muatSkrip: muatSkrip, infoPerangkat: infoPerangkat, dalamAplikasi: dalamAplikasi,
    hitungMundur: hitungMundur, memuat: memuat, csv: csv, unduh: unduh,
    setLabelVip: setLabelVip, teksVip: teksVip,
    labelAnggota: labelAnggota, LABEL_JK: LABEL_JK, daftarOrang: daftarOrang, ringkasJK: ringkasJK, teksAnggota: teksAnggota, badgeVip: badgeVip
  };
})();
