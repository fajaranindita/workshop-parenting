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
      if (!json.ok) {
        var e = new Error(json.error || 'Terjadi kesalahan.');
        e.kode = json.kode_error;
        throw e;
      }
      return json;
    });
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
  function siapkanFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('Pilih file terlebih dahulu.'));
      var tipe = file.type;
      if (tipe === 'application/pdf') {
        if (file.size > 2.5 * 1024 * 1024) return reject(new Error('Ukuran PDF maksimal 2,5 MB.'));
        var fr = new FileReader();
        fr.onload = function () { resolve({ mime: tipe, data: String(fr.result).split(',')[1], pratinjau: null }); };
        fr.onerror = function () { reject(new Error('File tidak terbaca.')); };
        return fr.readAsDataURL(file);
      }
      if (!/^image\//.test(tipe)) return reject(new Error('Format file harus gambar (JPG/PNG) atau PDF.'));
      var url = URL.createObjectURL(file);
      var img = new Image();
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
        resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1], pratinjau: dataUrl });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Gambar tidak terbaca. Coba format JPG/PNG.')); };
      img.src = url;
    });
  }

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
  function badgeVip(p) { return p && p.vip ? ' <span class="badge vip">VIP</span>' : ''; }

  window.App = {
    api: api, rupiah: rupiah, keDate: keDate, fmtTanggal: fmtTanggal, fmtJam: fmtJam, fmtWaktu: fmtWaktu,
    esc: esc, param: param, $: $, $$: $$, toast: toast, salin: salin, badge: badge, LABEL_STATUS: LABEL_STATUS,
    halaman: halaman, linkWA: linkWA, simpan: simpan, ambil: ambil, hapus: hapus, siapkanFile: siapkanFile,
    hitungMundur: hitungMundur, memuat: memuat, csv: csv, unduh: unduh,
    labelAnggota: labelAnggota, teksAnggota: teksAnggota, badgeVip: badgeVip
  };
})();
