/* Landing page — dirender dari data `publik` (isi teks diatur di dashboard, tab Landing Page) */
window.LANDING_VERSI = '2026.11.26';
(function () {
  'use strict';
  var A = window.App;

  var IKON = {
    tanggal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>',
    lokasi: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    jam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    wa: '<svg width="26" height="26" viewBox="0 0 24 24" fill="#1F9D55" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"></path></svg>'
  };

  function esc(s) { return A.esc(s); }
  function ada(s) { return s && String(s).trim(); }

  function render(info, el, opsi) {
    opsi = opsi || {};
    var L = info.landing, a = info.acara;
    var tanggal = a.tanggal_acara ? A.fmtTanggal(a.tanggal_acara) : '';
    if (L.ahad) tanggal = tanggal.replace(/^Minggu/, 'Ahad');
    var jam = a.tanggal_acara ? A.fmtJam(a.tanggal_acara) : '';
    var token = function (s) {
      return String(s || '').replace(/\{tanggal\}/g, tanggal).replace(/\{jam\}/g, jam)
        .replace(/\{lokasi\}/g, a.lokasi || '').replace(/\{nama_acara\}/g, a.nama_acara || '');
    };
    var t = function (s) { return esc(token(s)); };
    var kontak = (L.penutup.kontak || []).filter(function (k) { return k.wa; });
    var waTanya = kontak[0] ? kontak[0].wa : a.kontak_wa;
    var h = '';

    // ---------- Header ----------
    h += '<header class="lp-header"><div class="lp-isi lp-baris">';
    h += '<div class="lp-merek"><span class="lp-org">' + t(L.header.organisasi) + '</span>';
    if (ada(L.header.label)) h += '<span class="lp-garis"></span><span class="lp-label">' + t(L.header.label) + '</span>';
    h += '</div><a class="lp-btn lp-btn-emas lp-btn-kecil" href="#harga">' + t(L.header.tombol || 'Pesan Tiket') + '</a></div></header>';

    // ---------- Hero ----------
    h += '<section class="lp-hero"><div class="lp-isi lp-dua">';
    h += '<div class="lp-hero-teks"><div class="lp-lencana">';
    if (info.early_bird) h += '<span class="lp-lencana-merah">EARLY BIRD</span>';
    if (ada(L.hero.lencana)) h += '<span class="lp-lencana-garis">' + t(L.hero.lencana) + '</span>';
    h += '</div><h1>' + t(L.hero.judul || a.nama_acara) + '</h1>';
    if (ada(L.hero.kutipan)) h += '<p class="lp-kutipan">' + t(L.hero.kutipan) + '</p>';
    if (ada(L.hero.deskripsi)) h += '<p class="lp-desk">' + t(L.hero.deskripsi) + '</p>';
    h += '<div class="lp-meta">';
    if (tanggal) h += '<span>' + IKON.tanggal + esc(tanggal) + '</span><span>' + IKON.jam + esc(jam) + '</span>';
    if (a.lokasi) h += '<span>' + IKON.lokasi + (a.link_maps ? '<a href="' + esc(a.link_maps) + '" target="_blank" rel="noopener">' + esc(a.lokasi) + '</a>' : esc(a.lokasi)) + '</span>';
    h += '</div><div class="lp-cta">';
    h += '<a class="lp-btn lp-btn-emas lp-btn-besar" href="#harga">' + t(L.hero.tombol || 'Pesan Tiket') + '</a>';
    if (waTanya && ada(L.hero.tanya)) h += '<a class="lp-tautan-terang" target="_blank" rel="noopener" href="https://wa.me/' + esc(waTanya) + '">' + t(L.hero.tanya) + '</a>';
    h += '</div></div>';
    if (ada(L.hero.foto)) h += '<div class="lp-hero-foto"><div class="lp-bingkai"><img src="' + esc(L.hero.foto) + '" alt="' + t(L.hero.foto_alt) + '"></div></div>';
    h += '</div></section>';

    // ---------- Masalah ----------
    var m = L.masalah;
    if (ada(m.judul) || (m.poin || []).length) {
      h += '<section class="lp-krem lp-sesi"><div class="lp-isi lp-sempit lp-tumpuk">';
      if (ada(m.label)) h += '<p class="lp-sublabel lp-merah">' + t(m.label) + '</p>';
      if (ada(m.judul)) h += '<h2>' + t(m.judul) + '</h2>';
      if ((m.poin || []).length) h += '<div class="lp-grid-poin">' + m.poin.map(function (p) { return '<p class="lp-poin">' + t(p) + '</p>'; }).join('') + '</div>';
      if (ada(m.paragraf)) h += '<p class="lp-paragraf">' + t(m.paragraf) + '</p>';
      if (ada(m.penutup)) h += '<p class="lp-tegas">' + t(m.penutup) + '</p>';
      h += '</div></section>';
    }

    // ---------- Manfaat ----------
    var f = L.manfaat;
    if (ada(f.judul) || (f.kartu || []).length) {
      h += '<section class="lp-putih lp-sesi"><div class="lp-isi lp-tumpuk lp-celah-besar">';
      h += '<div class="lp-kepala">' + (ada(f.judul) ? '<h2>' + t(f.judul) + '</h2>' : '') + (ada(f.deskripsi) ? '<p class="lp-lead">' + t(f.deskripsi) + '</p>' : '') + '</div>';
      if ((f.kartu || []).length) {
        h += '<div class="lp-grid-kartu">' + f.kartu.map(function (k, i) {
          return '<div class="lp-kartu-hijau"><span class="lp-nomor">' + ('0' + (i + 1)).slice(-2) + '</span><h3>' + t(k.judul) + '</h3>' + (ada(k.isi) ? '<p>' + t(k.isi) + '</p>' : '') + '</div>';
        }).join('') + '</div>';
      }
      var daftar = function (judul, isi) {
        if (!(isi || []).length) return '';
        return '<div class="lp-kolom">' + (ada(judul) ? '<h3>' + t(judul) + '</h3>' : '') + '<ul>' + isi.map(function (x) { return '<li>' + t(x) + '</li>'; }).join('') + '</ul></div>';
      };
      var dua = daftar(f.bawa_judul, f.bawa) + daftar(f.cocok_judul, f.cocok);
      if (dua) h += '<div class="lp-kotak-krem">' + dua + '</div>';
      h += '</div></section>';
    }

    // ---------- Pembicara ----------
    var s = L.pembicara;
    if (ada(s.nama)) {
      h += '<section class="lp-hijau lp-sesi"><div class="lp-isi lp-dua lp-tengah">';
      if (ada(s.foto)) h += '<div class="lp-foto-bulat-wrap"><div class="lp-foto-bulat"><img src="' + esc(s.foto) + '" alt="Foto ' + t(s.nama) + '"></div></div>';
      h += '<div class="lp-tumpuk lp-pembicara">';
      if (ada(s.label)) h += '<p class="lp-sublabel lp-emas">' + t(s.label) + '</p>';
      h += '<h2>' + t(s.nama) + '</h2>';
      if (ada(s.bio)) h += '<p class="lp-bio">' + t(s.bio) + '</p>';
      var stat = (s.statistik || []).filter(function (x) { return ada(x.angka) || ada(x.label); });
      if (stat.length) h += '<div class="lp-grid-stat">' + stat.map(function (x) { return '<div class="lp-stat"><div class="lp-stat-angka">' + t(x.angka) + '</div><div class="lp-stat-label">' + t(x.label) + '</div></div>'; }).join('') + '</div>';
      if (ada(s.testimoni)) h += '<blockquote class="lp-testi">' + t(s.testimoni) + (ada(s.testimoni_oleh) ? '<br><span>' + t(s.testimoni_oleh) + '</span>' : '') + '</blockquote>';
      h += '</div></div></section>';
    }

    // ---------- Harga (otomatis dari jenis tiket) ----------
    h += '<section class="lp-krem lp-sesi" id="harga"><div class="lp-isi lp-tumpuk lp-celah-besar">';
    h += '<div class="lp-tengah-teks"><h2>' + t(L.harga.judul || 'Pilih tiket Anda') + '</h2>';
    h += '<p class="lp-lead">' + [tanggal, jam, a.lokasi].filter(Boolean).map(esc).join(' · ') + '</p></div>';
    h += hargaKartu(info, L, tanggal);
    if (ada(L.harga.catatan)) h += '<p class="lp-catatan-merah">' + t(L.harga.catatan) + '</p>';
    h += '</div></section>';

    // ---------- Rangkaian ----------
    var r = L.rangkaian;
    if (ada(r.judul)) {
      h += '<section class="lp-pita"><div class="lp-isi lp-baris lp-pita-isi">';
      h += '<div class="lp-pita-judul">' + (ada(r.label) ? '<span class="lp-sublabel">' + t(r.label) + '</span>' : '') + '<span class="lp-pita-nama">' + t(r.judul) + '</span></div>';
      h += '<p>' + t(r.isi) + (ada(r.link_url) && ada(r.link_teks) ? ' <a href="' + esc(r.link_url) + '" target="_blank" rel="noopener">' + t(r.link_teks) + '</a>' : '') + '</p>';
      h += '</div></section>';
    }

    // ---------- FAQ ----------
    var faq = (L.faq || []).filter(function (q) { return ada(q.t); });
    if (faq.length) {
      h += '<section class="lp-putih lp-sesi"><div class="lp-isi lp-faq">';
      h += '<h2 class="lp-tengah-teks">Pertanyaan yang sering muncul</h2>';
      h += faq.map(function (q) { return '<details><summary>' + t(q.t) + '</summary><p>' + t(q.j) + '</p></details>'; }).join('');
      h += '</div></section>';
    }

    // ---------- Penutup ----------
    var p = L.penutup;
    h += '<section class="lp-hijau lp-sesi lp-penutup"><div class="lp-isi lp-sempit lp-tumpuk lp-tengah-teks">';
    if (ada(p.judul1) || ada(p.judul2)) h += '<h2 class="lp-judul-penutup">' + t(p.judul1) + (ada(p.judul2) ? '<br><span>' + t(p.judul2) + '</span>' : '') + '</h2>';
    if (ada(p.deskripsi)) h += '<p class="lp-lead">' + t(p.deskripsi) + '</p>';
    h += '<div class="lp-cta lp-cta-tengah"><a class="lp-btn lp-btn-emas lp-btn-besar" href="#harga">' + t(L.hero.tombol || 'Pesan Tiket') + '</a></div>';
    if (kontak.length) {
      h += '<div class="lp-kontak">' + kontak.map(function (k) {
        return '<a class="lp-kontak-kartu" target="_blank" rel="noopener" href="https://wa.me/' + esc(k.wa) + '">' + IKON.wa +
          '<span><b>' + t(k.nama) + '</b><small>+' + esc(formatNomor(k.wa)) + '</small></span></a>';
      }).join('') + '</div>';
    }
    h += '</div></section>';
    if (ada(L.footer)) h += '<footer class="lp-footer">' + t(L.footer) + '</footer>';

    el.innerHTML = h;
    document.title = a.nama_acara || 'Pendaftaran';
  }

  function formatNomor(n) {
    n = String(n || '');
    return n.slice(0, 2) + ' ' + n.slice(2, 5) + '-' + n.slice(5, 9) + (n.length > 9 ? '-' + n.slice(9) : '');
  }

  function hargaKartu(info, L, tanggal) {
    var tiket = info.tiket || [];
    if (!tiket.length) return '<p class="lp-tengah-teks lp-lead">Informasi tiket segera diumumkan.</p>';
    var akhirEB = info.early_bird_akhir ? A.fmtTanggal(info.early_bird_akhir, { weekday: undefined }) : '';
    var h = '<div class="lp-grid-harga">';
    tiket.forEach(function (k) {
      var sorot = L.harga.sorot && L.harga.sorot === k.id;
      var hemat = k.harga_normal - k.harga;
      var kelas = 'lp-harga' + (sorot ? ' lp-harga-sorot' : '') + (k.vip && !sorot ? ' lp-harga-vip' : '');
      h += '<div class="' + kelas + '">';
      h += '<div class="lp-harga-atas"><span class="lp-harga-nama">' + esc(k.nama) + '</span>';
      if (hemat > 0) h += '<span class="lp-pil-emas">Hemat ' + A.rupiah(hemat) + '</span>';
      else if (k.vip) h += '<span class="lp-pil-emas">VIP</span>';
      h += '</div>';
      if (k.keterangan) h += '<p class="lp-harga-ket">' + esc(k.keterangan) + '</p>';
      if (hemat > 0) h += '<p class="lp-harga-coret">' + A.rupiah(k.harga_normal) + '</p>';
      h += '<p class="lp-harga-angka">' + A.rupiah(k.harga) + '</p>';
      var info2 = [];
      if (k.orang > 1) info2.push('Untuk ' + k.orang + ' orang' + (k.orang > 2 ? ' · ' + A.rupiah(Math.round(k.harga / k.orang)) + '/orang' : ''));
      if (hemat > 0 && akhirEB) info2.push('Harga early bird s.d. ' + akhirEB);
      if (info.status === 'buka' && k.sisa > 0 && k.sisa <= 20) info2.push('Sisa ' + k.sisa + ' tiket');
      if (info2.length) h += '<p class="lp-harga-kecil">' + info2.map(esc).join('<br>') + '</p>';
      h += tombolHarga(info, k);
      h += '</div>';
    });
    return h + '</div>';
  }

  function tombolHarga(info, k) {
    if (info.status === 'buka' && k.sisa > 0) return '<a class="lp-btn lp-btn-pesan" href="#daftar-' + encodeURIComponent(k.id) + '">Pesan Sekarang</a>';
    var teks = info.status === 'belum_buka' ? 'Dibuka ' + A.fmtTanggal(info.buka, { weekday: undefined }) + ', ' + A.fmtJam(info.buka)
      : info.status === 'tutup' ? 'Pendaftaran ditutup'
      : info.status === 'belum_diatur' ? 'Segera dibuka' : 'Habis';
    return '<span class="lp-btn lp-btn-mati">' + esc(teks) + '</span>';
  }

  window.Landing = { render: render };
})();
