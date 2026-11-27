/* Landing page — dirender dari data `publik` (isi teks diatur di dashboard, tab Landing Page) */
window.LANDING_VERSI = '2026.11.28';
(function () {
  'use strict';
  var A = window.App;

  var IKON = {
    tanggal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>',
    lokasi: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    jam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    mitra: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 17l2 2a1 1 0 0 0 3-3"></path><path d="M14 14l2.5 2.5a1 1 0 0 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path><path d="M21 3l1 11h-2"></path><path d="M3 3L2 14l6.5 6.5a1 1 0 1 0 3-3"></path><path d="M3 4h8"></path></svg>',
    tutup: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
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
    // Tautan WhatsApp dengan pesan pembuka yang diatur di dashboard
    var linkWA = function (nomor, namaKontak) {
      var pesan = token(L.penutup.pesan_wa || '').replace(/\{nama_kontak\}/g, namaKontak || 'Panitia').trim();
      return 'https://wa.me/' + String(nomor).replace(/\D/g, '') + (pesan ? '?text=' + encodeURIComponent(pesan) : '');
    };
    var h = '';

    /** Logo penyelenggara di posisi tertentu (header / hero / penutup / footer), sesuai pengaturan */
    var logo = function (tempat) {
      var g = L.logo || {};
      if (!g.aktif || !g.file || !g['di_' + tempat]) return '';
      return '<span class="lp-logo lp-logo-' + tempat + ' lp-logo-' + esc(g.ukuran || 'sedang') + (g.latar === 'tanpa' ? '' : ' lp-logo-putih') + '">' +
        '<img src="' + esc(g.file) + '" alt="Logo ' + t(L.header.organisasi || '') + '"></span>';
    };

    // ---------- Header ----------
    h += '<header class="lp-header"><div class="lp-isi lp-baris">';
    h += '<div class="lp-merek">' + logo('header') + (ada(L.header.organisasi) ? '<span class="lp-org">' + t(L.header.organisasi) + '</span>' : '');
    if (ada(L.header.label_logo)) h += '<span class="lp-garis"></span><img class="lp-label-logo" src="' + esc(L.header.label_logo) + '" alt="' + t(L.header.label || 'Logo') + '">';
    else if (ada(L.header.label)) h += '<span class="lp-garis"></span><span class="lp-label">' + t(L.header.label) + '</span>';
    h += '</div><a class="lp-btn lp-btn-emas lp-btn-kecil" href="#harga">' + t(L.header.tombol || 'Pesan Tiket') + '</a></div></header>';

    // ---------- Hero ----------
    h += '<section class="lp-hero"><div class="lp-isi lp-dua">';
    h += '<div class="lp-hero-teks">' + logo('hero') + '<div class="lp-lencana">';
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
    if (waTanya && ada(L.hero.tanya)) h += '<a class="lp-tautan-terang" target="_blank" rel="noopener" href="' + esc(linkWA(waTanya, kontak[0] ? kontak[0].nama : '')) + '">' + t(L.hero.tanya) + '</a>';
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

    // ---------- Didukung oleh (logo sponsor) ----------
    var sp = info.sponsor || null;
    h += logoSponsor(sp);

    // ---------- FAQ ----------
    var faq = (L.faq || []).filter(function (q) { return ada(q.t); });
    if (faq.length) {
      h += '<section class="lp-putih lp-sesi"><div class="lp-isi lp-faq">';
      h += '<h2 class="lp-tengah-teks">Pertanyaan yang sering muncul</h2>';
      h += faq.map(function (q) { return '<details><summary>' + t(q.t) + '</summary><p>' + t(q.j) + '</p></details>'; }).join('');
      h += '</div></section>';
    }

    // ---------- Peluang kemitraan ----------
    if (sp && sp.halaman && sp.bagian) {
      h += '<section class="lp-mitra" id="kemitraan"><div class="lp-isi lp-mitra-isi">';
      h += '<div class="lp-mitra-ikon">' + IKON.mitra + '</div><div class="lp-mitra-teks">';
      if (ada(sp.bagian.judul)) h += '<h2>' + t(sp.bagian.judul) + '</h2>';
      if (ada(sp.bagian.isi)) h += '<p>' + t(sp.bagian.isi) + '</p>';
      h += '</div><a class="lp-btn lp-btn-hijau lp-btn-besar" href="sponsor.html">' + t(sp.bagian.tombol || 'Lihat paket sponsor') + '</a>';
      h += '</div></section>';
    }

    // ---------- Penutup ----------
    var p = L.penutup;
    h += '<section class="lp-hijau lp-sesi lp-penutup"><div class="lp-isi lp-sempit lp-tumpuk lp-tengah-teks">' + logo('penutup');
    if (ada(p.judul1) || ada(p.judul2)) h += '<h2 class="lp-judul-penutup">' + t(p.judul1) + (ada(p.judul2) ? '<br><span>' + t(p.judul2) + '</span>' : '') + '</h2>';
    if (ada(p.deskripsi)) h += '<p class="lp-lead">' + t(p.deskripsi) + '</p>';
    h += '<div class="lp-cta lp-cta-tengah"><a class="lp-btn lp-btn-emas lp-btn-besar" href="#harga">' + t(L.hero.tombol || 'Pesan Tiket') + '</a></div>';
    if (kontak.length) {
      h += '<div class="lp-kontak">' + kontak.map(function (k) {
        return '<a class="lp-kontak-kartu" target="_blank" rel="noopener" href="' + esc(linkWA(k.wa, k.nama)) + '">' + IKON.wa +
          '<span><b>' + t(k.nama) + '</b><small>+' + esc(formatNomor(k.wa)) + '</small></span></a>';
      }).join('') + '</div>';
    }
    h += '</div></section>';
    var logoFooter = logo('footer');
    var linkMitra = sp && sp.halaman ? '<div class="lp-footer-link"><a href="sponsor.html">Peluang menjadi sponsor</a></div>' : '';
    if (ada(L.footer) || logoFooter || linkMitra) h += '<footer class="lp-footer">' + (logoFooter ? '<div>' + logoFooter + '</div>' : '') + t(L.footer) + linkMitra + '</footer>';

    // ---------- Bilah sponsor yang menempel di bawah layar ----------
    if (sp && sp.halaman && sp.bilah && !tutupBilah()) {
      h += '<div class="lp-bilah" id="lpBilah" role="region" aria-label="Info sponsor"><div class="lp-bilah-isi">';
      h += '<span class="lp-bilah-ikon">' + IKON.mitra + '</span><span class="lp-bilah-teks">' + t(sp.bilah.teks) + '</span>';
      h += '<a class="lp-bilah-tombol" href="sponsor.html">' + t(sp.bilah.tombol || 'Lihat paket') + ' →</a>';
      h += '<button type="button" class="lp-bilah-tutup" aria-label="Tutup info sponsor">' + IKON.tutup + '</button>';
      h += '</div></div>';
    }

    el.innerHTML = h;
    pasangBilah(el);
    document.title = a.nama_acara || 'Pendaftaran';
  }

  var KUNCI_BILAH = 'ws_bilah_sponsor_tutup';
  function tutupBilah() { try { return !!localStorage.getItem(KUNCI_BILAH); } catch (e) { return false; } }

  /** Logo sponsor per tingkat: Platinum paling besar, lalu Gold, lalu sisanya */
  function logoSponsor(sp) {
    if (!sp || !sp.logo || !(sp.logo.daftar || []).length) return '';
    var kelompok = { besar: [], sedang: [], kecil: [] };
    sp.logo.daftar.forEach(function (x) {
      (x.tingkat === 'platinum' ? kelompok.besar : x.tingkat === 'gold' ? kelompok.sedang : kelompok.kecil).push(x);
    });
    var h = '<section class="lp-putih lp-sesi lp-dukung"><div class="lp-isi lp-tumpuk lp-tengah-teks">';
    if (ada(sp.logo.judul)) h += '<p class="lp-sublabel lp-merah">' + esc(String(sp.logo.judul).toUpperCase()) + '</p>';
    ['besar', 'sedang', 'kecil'].forEach(function (uk) {
      if (!kelompok[uk].length) return;
      h += '<div class="lp-dukung-baris lp-dukung-' + uk + '">' + kelompok[uk].map(function (x) {
        var img = '<img src="' + esc(x.file) + '" alt="' + esc(x.nama || 'Logo sponsor') + '" onerror="this.parentNode.style.display=\'none\'">';
        return x.tautan ? '<a class="lp-dukung-logo" href="' + esc(x.tautan) + '" target="_blank" rel="noopener sponsored">' + img + '</a>'
          : '<span class="lp-dukung-logo">' + img + '</span>';
      }).join('') + '</div>';
    });
    return h + '</div></section>';
  }

  /** Bilah muncul setelah melewati bagian atas, dan menyingkir saat bagian kemitraan / penutup terlihat */
  var bilahTerpasang = false;
  function pasangBilah(el) {
    var bar = el.querySelector('#lpBilah');
    if (!bar) return;
    bar.querySelector('.lp-bilah-tutup').addEventListener('click', function () {
      try { localStorage.setItem(KUNCI_BILAH, String(Date.now())); } catch (e) { }
      bar.remove();
    });
    perbaruiBilah();
    if (bilahTerpasang) return;
    bilahTerpasang = true;
    var jadwal = false;
    var cek = function () { if (jadwal) return; jadwal = true; requestAnimationFrame(function () { jadwal = false; perbaruiBilah(); }); };
    window.addEventListener('scroll', cek, { passive: true });
    window.addEventListener('resize', cek);
  }
  function perbaruiBilah() {
    var bar = document.getElementById('lpBilah');
    if (!bar) return;
    var hero = document.querySelector('.lp-hero');
    var lewatHero = hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > 400;
    var tinggi = window.innerHeight;
    var bertabrakan = Array.prototype.some.call(document.querySelectorAll('#kemitraan, .lp-penutup, .lp-footer'), function (s) {
      var r = s.getBoundingClientRect(); return r.top < tinggi && r.bottom > 0;
    });
    var tampil = lewatHero && !bertabrakan;
    if (bar.classList.contains('lp-bilah-tampil') !== tampil) bar.classList.toggle('lp-bilah-tampil', tampil);
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
      var kelas = 'lp-harga' + (sorot ? ' lp-harga-sorot' : '') + (k.vip && !sorot ? ' lp-harga-vip' : '') + (k.bisa_dibeli === false && k.kode_alasan !== 'belum_buka' ? ' lp-harga-redup' : '');
      h += '<div class="' + kelas + '">';
      h += '<div class="lp-harga-atas"><span class="lp-harga-nama">' + esc(k.nama) + '</span>';
      if (hemat > 0) h += '<span class="lp-pil-emas">Hemat ' + A.rupiah(hemat) + '</span>';
      else if (k.vip) h += '<span class="lp-pil-emas">' + esc(A.teksVip()) + '</span>';
      h += '</div>';
      if (k.keterangan) h += '<p class="lp-harga-ket">' + A.formatKet(k.keterangan) + '</p>';
      if (hemat > 0) h += '<p class="lp-harga-coret">' + A.rupiah(k.harga_normal) + '</p>';
      h += '<p class="lp-harga-angka">' + A.rupiah(k.harga) + '</p>';
      var info2 = [];
      if (k.orang > 1) info2.push('Untuk ' + k.orang + ' orang' + (k.orang > 2 ? ' · ' + A.rupiah(Math.round(k.harga / k.orang)) + '/orang' : ''));
      if (hemat > 0 && akhirEB) info2.push('Harga early bird s.d. ' + akhirEB);
      if (k.bisa_dibeli && k.sisa <= 20) info2.push('Sisa ' + k.sisa + ' tiket');
      if (info2.length) h += '<p class="lp-harga-kecil">' + info2.map(esc).join('<br>') + '</p>';
      h += tombolHarga(info, k);
      h += '</div>';
    });
    return h + '</div>';
  }

  function tombolHarga(info, k) {
    if (k.bisa_dibeli !== undefined) {
      if (k.bisa_dibeli) return '<a class="lp-btn lp-btn-pesan" href="#daftar-' + encodeURIComponent(k.id) + '">Pesan Sekarang</a>';
      if (k.alasan && k.kode_alasan !== 'belum_buka') return '<span class="lp-btn lp-btn-mati">' + esc(k.alasan) + '</span>';
    }
    if (info.status === 'buka' && k.sisa > 0) return '<a class="lp-btn lp-btn-pesan" href="#daftar-' + encodeURIComponent(k.id) + '">Pesan Sekarang</a>';
    var teks = info.status === 'belum_buka' ? 'Dibuka ' + A.fmtTanggal(info.buka, { weekday: undefined }) + ', ' + A.fmtJam(info.buka)
      : info.status === 'tutup' ? 'Pendaftaran ditutup'
      : info.status === 'belum_diatur' ? 'Segera dibuka' : 'Habis';
    return '<span class="lp-btn lp-btn-mati">' + esc(teks) + '</span>';
  }

  window.Landing = { render: render, logoSponsor: logoSponsor, IKON: IKON, formatNomor: formatNomor };
})();
