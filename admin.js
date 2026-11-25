/* Dashboard panitia */
window.ADMIN_VERSI = '2026.11.25';
(function () {
  'use strict';
  var A = App, $ = A.$, $$ = A.$$, esc = A.esc;

  var S = {
    sesi: null, admin: null, bank: '', acara: {}, batasJam: 24,
    peserta: [], filter: 'menunggu_verifikasi', cari: '', tab: 'peserta',
    pengaturan: null, hasilMutasi: []
  };

  var URUTAN_STATUS = ['menunggu_verifikasi', 'menunggu_bayar', 'ditolak', 'lunas', 'hadir', 'kedaluwarsa', 'batal'];

  // ---------------- Sesi ----------------
  function apiA(aksi, data) {
    return A.api(aksi, Object.assign({ sesi: S.sesi }, data || {})).catch(function (e) {
      if (e.kode === 'SESI') { keluar(true); }
      throw e;
    });
  }

  function mulai() {
    S.sesi = A.ambil('ws_sesi');
    if (!S.sesi) return tampilLogin();
    apiA('me').then(masuk).catch(function () { tampilLogin(); });
  }

  function tampilLogin() {
    $('#vUtama').hidden = true;
    $('#vLogin').hidden = false;
  }

  function masuk(me) {
    S.admin = me.admin; S.bank = me.bank; S.acara = me.acara; S.batasJam = me.batas_bayar_jam; S.asal = me.asal || [];
    $('#vLogin').hidden = true;
    $('#vUtama').hidden = false;
    $('#judulAcara').textContent = S.acara.nama_acara || 'Dashboard';
    $('#infoAdmin').textContent = S.admin.nama + ' (' + S.admin.peran + ')';
    $('#tabPengaturan').hidden = S.admin.peran !== 'koordinator';
    $('#mBank').textContent = S.bank;
    muatPeserta();
  }

  function keluar(diam) {
    if (!diam && S.sesi) A.api('logout', { sesi: S.sesi }).catch(function () { });
    A.hapus('ws_sesi'); S.sesi = null;
    tampilLogin();
    if (diam) A.toast('Sesi berakhir, silakan login kembali.', true);
  }

  $('#formLogin').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#lBtn'), err = $('#lError');
    btn.disabled = true; err.hidden = true;
    A.api('login', { username: $('#lUser').value, password: $('#lPass').value })
      .then(function (r) {
        S.sesi = r.sesi; A.simpan('ws_sesi', r.sesi);
        $('#lPass').value = '';
        return apiA('me').then(masuk);
      })
      .catch(function (e) { err.textContent = e.message; err.hidden = false; })
      .then(function () { btn.disabled = false; });
  });
  $('#btnKeluar').addEventListener('click', function () { keluar(false); });

  // ---------------- Tab ----------------
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () { bukaTab(t.getAttribute('data-tab')); });
  });
  function bukaTab(nama) {
    S.tab = nama;
    $$('.tab').forEach(function (t) { t.classList.toggle('aktif', t.getAttribute('data-tab') === nama); });
    $('#tPeserta').hidden = nama !== 'peserta';
    $('#tMutasi').hidden = nama !== 'mutasi';
    $('#tPengaturan').hidden = nama !== 'pengaturan';
    $('#tLog').hidden = nama !== 'log';
    if (nama === 'pengaturan') muatPengaturan();
    if (nama === 'log') muatLog();
    if (nama === 'mutasi' && !S.peserta.length) muatPeserta();
  }

  // ---------------- Peserta ----------------
  function muatPeserta(diam) {
    if (!diam) $('#tbPeserta').innerHTML = '<tr><td colspan="7">' + A.memuat() + '</td></tr>';
    return apiA('peserta').then(function (r) {
      S.peserta = r.peserta;
      $('#infoMuat').textContent = 'Diperbarui ' + A.fmtJam(new Date()) + ' · ' + S.peserta.length + ' pendaftaran';
      renderPeserta();
    }).catch(function (e) { if (!diam) A.toast(e.message, true); });
  }

  function hitung() {
    var c = { semua: S.peserta.length }, orangLunas = 0, orangAktif = 0, uang = 0, anak = 0;
    URUTAN_STATUS.forEach(function (s) { c[s] = 0; });
    S.peserta.forEach(function (p) {
      c[p.status] = (c[p.status] || 0) + 1;
      if (p.status === 'lunas' || p.status === 'hadir') { orangLunas += p.orang; uang += p.nominal; anak += p.jumlah_anak; }
      if (['menunggu_bayar', 'menunggu_verifikasi', 'ditolak', 'lunas', 'hadir'].indexOf(p.status) >= 0) orangAktif += p.orang;
    });
    return { c: c, orangLunas: orangLunas, orangAktif: orangAktif, uang: uang, anak: anak };
  }

  function renderPeserta() {
    var h = hitung();
    $('#stat').innerHTML = [
      ['Peserta lunas (orang)', h.orangLunas],
      ['Total terdaftar (orang)', h.orangAktif],
      ['Menunggu verifikasi', h.c.menunggu_verifikasi],
      ['Menunggu bayar', h.c.menunggu_bayar + h.c.ditolak],
      ['Dana masuk', A.rupiah(h.uang)],
      ['Anak dititipkan', h.anak]
    ].map(function (s) { return '<div class="stat"><div class="angka">' + s[1] + '</div><div class="lbl">' + s[0] + '</div></div>'; }).join('');
    renderRekap();

    $('#chips').innerHTML = ['semua'].concat(URUTAN_STATUS).map(function (s) {
      return '<button class="chip' + (S.filter === s ? ' aktif' : '') + '" data-f="' + s + '">' + (s === 'semua' ? 'Semua' : A.LABEL_STATUS[s]) + ' (' + (h.c[s] || 0) + ')</button>';
    }).join('');

    var q = S.cari.toLowerCase().replace(/[.\s]/g, '');
    var daftar = S.peserta.filter(function (p) {
      if (S.filter !== 'semua' && p.status !== S.filter) return false;
      if (!q) return true;
      return (p.nama + A.teksAnggota(p) + p.kode + p.wa + p.nominal + p.email + p.asal).toLowerCase().replace(/[.\s]/g, '').indexOf(q) >= 0;
    }).sort(function (a, b) {
      if (S.filter === 'menunggu_verifikasi') return (a.bukti_waktu || '').localeCompare(b.bukti_waktu || '');
      return (b.dibuat || '').localeCompare(a.dibuat || '');
    });

    $('#tbPeserta').innerHTML = daftar.length ? daftar.map(function (p) {
      var klaim = p.dicek_oleh && p.dicek_oleh !== S.admin.username && p.dicek_waktu && (new Date() - new Date(p.dicek_waktu)) < 600000;
      return '<tr class="klik" data-kode="' + esc(p.kode) + '"><td><b>' + esc(p.kode) + '</b>' + A.badgeVip(p) + '</td><td>' + esc(p.nama) +
        (p.anggota.length ? '<br><small>+ ' + esc(A.teksAnggota(p)) + '</small>' : '') + '<br><small>' + esc(p.wa) + '</small>' + (p.asal ? '<br><small class="asal">' + esc(p.asal) + '</small>' : '') + '</td>' +
        '<td>' + esc(p.jenis_nama) + (p.jenis_kelamin.length ? '<br><small>' + esc(A.ringkasJK(p)) + '</small>' : '') + (p.jumlah_anak ? '<br><small>+ ' + p.jumlah_anak + ' anak</small>' : '') + '</td>' +
        '<td class="angka">' + A.rupiah(p.nominal) + '</td><td>' + A.badge(p.status) + (klaim ? '<br><small>🔎 dicek ' + esc(p.dicek_oleh) + '</small>' : '') + '</td>' +
        '<td>' + (p.ada_bukti ? '📎' : '') + '</td><td><small>' + A.fmtWaktu(p.dibuat) + '</small></td></tr>';
    }).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">Tidak ada data.</td></tr>';
  }

  $('#chips').addEventListener('click', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f) { S.filter = f; renderPeserta(); }
  });
  $('#cari').addEventListener('input', function (e) { S.cari = e.target.value; renderPeserta(); });
  $('#btnMuat').addEventListener('click', function () { muatPeserta(); });
  $('#tbPeserta').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-kode]');
    if (tr) bukaDetail(tr.getAttribute('data-kode'));
  });
  $('#btnCsv').addEventListener('click', function () {
    var kol = ['kode', 'status', 'vip', 'nama', 'anggota', 'jenis_kelamin', 'asal', 'wa', 'email', 'jenis_nama', 'orang', 'jumlah_anak', 'usia_anak', 'harga_tiket', 'biaya_anak', 'kode_unik', 'nominal', 'dibuat', 'diverifikasi_oleh', 'diverifikasi_waktu', 'checkin_waktu', 'pertanyaan'];
    var rows = [kol].concat(S.peserta.map(function (p) {
      return kol.map(function (k) { return k === 'anggota' ? A.teksAnggota(p) : k === 'jenis_kelamin' ? A.ringkasJK(p) : k === 'vip' ? (p.vip ? 'VIP' : '') : p[k]; });
    }));
    A.unduh('peserta-' + new Date().toISOString().slice(0, 10) + '.csv', A.csv(rows));
  });
  // Satu baris per orang (bukan per tiket) — untuk denah tempat duduk dan cetak sertifikat
  $('#btnCsvOrang').addEventListener('click', function () {
    var rows = [['kode', 'status', 'nama', 'jenis_kelamin', 'peran', 'asal', 'jenis_tiket', 'vip', 'wa_pendaftar', 'checkin_waktu']];
    S.peserta.filter(function (p) { return p.status === 'lunas' || p.status === 'hadir'; }).forEach(function (p) {
      A.daftarOrang(p).forEach(function (o) {
        rows.push([p.kode, p.status, o.nama, A.LABEL_JK[o.jk] || '', o.peran, p.asal, p.jenis_nama, p.vip ? 'VIP' : '', p.wa, p.checkin_waktu]);
      });
    });
    A.unduh('peserta-per-orang-' + new Date().toISOString().slice(0, 10) + '.csv', A.csv(rows));
  });

  /** Rekap peserta lunas: jenis kelamin per jenis tiket & jumlah orang per asal */
  function renderRekap() {
    var perTiket = {}, perAsal = {}, total = { L: 0, P: 0, x: 0 };
    S.peserta.forEach(function (p) {
      if (p.status !== 'lunas' && p.status !== 'hadir') return;
      var t = perTiket[p.jenis_nama] = perTiket[p.jenis_nama] || { L: 0, P: 0, x: 0, vip: p.vip };
      A.daftarOrang(p).forEach(function (o) { var k = o.jk === 'L' || o.jk === 'P' ? o.jk : 'x'; t[k]++; total[k]++; });
      var a = p.asal || '(tidak diisi)';
      if (a.indexOf('Lainnya: ') === 0) a = 'Lainnya';
      perAsal[a] = (perAsal[a] || 0) + p.orang;
    });
    var baris = function (nama, x, vip) {
      return '<tr><td>' + esc(nama) + (vip ? ' <span class="badge vip">VIP</span>' : '') + '</td><td class="angka">' + x.L + '</td><td class="angka">' + x.P + '</td>' +
        (total.x ? '<td class="angka">' + x.x + '</td>' : '') + '<td class="angka"><b>' + (x.L + x.P + x.x) + '</b></td></tr>';
    };
    var h = '<div class="grid2" style="margin-top:12px"><div><h3>Jenis kelamin per tiket</h3><div class="tabel-wrap"><table><thead><tr><th>Tiket</th><th class="angka">Laki-laki</th><th class="angka">Perempuan</th>' +
      (total.x ? '<th class="angka">Belum diisi</th>' : '') + '<th class="angka">Total</th></tr></thead><tbody>';
    Object.keys(perTiket).sort().forEach(function (k) { h += baris(k, perTiket[k], perTiket[k].vip); });
    h += baris('Semua', total) + '</tbody></table></div></div>';
    h += '<div><h3>Asal peserta (orang)</h3><div class="tabel-wrap"><table><tbody>' +
      (Object.keys(perAsal).sort().map(function (a) { return '<tr><td>' + esc(a) + '</td><td class="angka"><b>' + perAsal[a] + '</b></td></tr>'; }).join('') || '<tr><td class="muted">Belum ada peserta lunas.</td></tr>') +
      '</tbody></table></div><p class="hint">Dihitung dari asal pendaftar utama; seluruh orang dalam satu tiket ikut asal tersebut.</p></div></div>';
    $('#rekap').innerHTML = h;
  }

  // Muat ulang otomatis tiap 60 detik saat tab peserta terbuka
  setInterval(function () {
    if (S.sesi && S.tab === 'peserta' && !$('#modal').classList.contains('tampil') && !document.hidden) muatPeserta(true);
  }, 60000);

  // ---------------- Pesan WA ----------------
  function pesanTiket(p) {
    return 'Halo ' + p.nama + ',\n\nPembayaran Anda untuk *' + S.acara.nama_acara + '* sudah kami terima. Terima kasih! 🙏\n\nE-tiket Anda (kode ' + p.kode + '):\n' +
      A.halaman('tiket.html', { t: p.token_tiket }) + '\n\nTunjukkan QR code pada e-tiket saat registrasi ulang.' +
      (S.acara.tanggal_acara ? '\n📅 ' + A.fmtTanggal(S.acara.tanggal_acara) + ', ' + A.fmtJam(S.acara.tanggal_acara) : '') +
      (S.acara.lokasi ? '\n📍 ' + S.acara.lokasi : '') + '\n\nSampai jumpa!';
  }
  function pesanIngat(p) {
    return 'Halo ' + p.nama + ',\n\nPendaftaran *' + S.acara.nama_acara + '* Anda (kode ' + p.kode + ') masih menunggu pembayaran sebesar *' + A.rupiah(p.nominal) +
      '* sebelum ' + A.fmtWaktu(p.batas_bayar) + '.\n\nInstruksi pembayaran & unggah bukti:\n' + A.halaman('bayar.html', { k: p.kode, a: p.akses });
  }
  function pesanTolak(p) {
    return 'Halo ' + p.nama + ',\n\nMohon maaf, bukti pembayaran untuk pendaftaran *' + S.acara.nama_acara + '* (kode ' + p.kode + ') belum bisa kami verifikasi.\nAlasan: ' + p.alasan_tolak +
      '\n\nSilakan unggah ulang sebelum ' + A.fmtWaktu(p.batas_bayar) + ':\n' + A.halaman('bayar.html', { k: p.kode, a: p.akses });
  }

  // ---------------- Modal detail ----------------
  function bukaModal(html) { $('#modalIsi').innerHTML = html; $('#modal').classList.add('tampil'); }
  function tutupModal() { $('#modal').classList.remove('tampil'); }
  $('#modalTutup').addEventListener('click', tutupModal);
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') tutupModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutupModal(); });

  function perbaruiLokal(p) {
    for (var i = 0; i < S.peserta.length; i++) if (S.peserta[i].kode === p.kode) { S.peserta[i] = p; break; }
    renderPeserta();
  }

  function bukaDetail(kode) {
    bukaModal(A.memuat('Memuat detail…'));
    apiA('detail', { kode: kode }).then(function (r) {
      var p = r.peserta;
      perbaruiLokal(p);
      renderDetail(p, r.bukti, r.peringatan);
    }).catch(function (e) { bukaModal('<div class="banner danger">' + esc(e.message) + '</div>'); });
  }

  function renderDetail(p, bukti, peringatan) {
    S.buktiDetail = bukti; // disimpan agar bukti tetap tampil setelah diterima/ditolak
    var koor = S.admin.peran === 'koordinator';
    var h = '<h2>' + esc(p.nama) + ' ' + A.badge(p.status) + A.badgeVip(p) + '</h2>';
    if (peringatan) h += '<div class="banner warn">⚠ ' + esc(peringatan) + '</div>';
    h += '<div class="grid2"><div class="seksi"><dl class="dl">';
    h += '<dt>Kode</dt><dd>' + esc(p.kode) + '</dd>';
    h += '<dt>WhatsApp</dt><dd>' + esc(p.wa) + '</dd>';
    if (p.email) h += '<dt>Email</dt><dd>' + esc(p.email) + '</dd>';
    if (p.asal) h += '<dt>Asal</dt><dd>' + esc(p.asal) + '</dd>';
    h += '<dt>Tiket</dt><dd>' + esc(p.jenis_nama) + ' (' + p.orang + ' org)</dd>';
    h += '<dt>Peserta</dt><dd>' + A.daftarOrang(p).map(function (o) {
      return esc(o.nama || '-') + ' <small class="muted">(' + (A.LABEL_JK[o.jk] || 'jenis kelamin belum diisi') + (p.orang > 1 ? ', ' + esc(o.peran) : '') + ')</small>';
    }).join('<br>') + '</dd>';
    if (p.jumlah_anak) h += '<dt>Penitipan</dt><dd>' + p.jumlah_anak + ' anak (usia ' + esc(p.usia_anak) + ')</dd>';
    h += '<dt>Didaftar</dt><dd>' + A.fmtWaktu(p.dibuat) + '</dd>';
    if (p.pertanyaan) h += '<dt>Pertanyaan</dt><dd style="font-weight:400">' + esc(p.pertanyaan) + '</dd>';
    h += '</dl></div><div class="seksi"><dl class="dl">';
    h += '<dt>Harga tiket</dt><dd>' + A.rupiah(p.harga_tiket) + '</dd>';
    if (p.biaya_anak) h += '<dt>Biaya anak</dt><dd>' + A.rupiah(p.biaya_anak) + '</dd>';
    h += '<dt>Kode unik</dt><dd>' + p.kode_unik + '</dd>';
    h += '<dt>Harus transfer</dt><dd style="font-size:1.2rem;color:var(--accent)">' + A.rupiah(p.nominal) + '</dd>';
    h += '<dt>Bank tujuan</dt><dd>' + esc(p.bank) + '</dd>';
    if (p.status === 'menunggu_bayar' || p.status === 'ditolak') h += '<dt>Batas bayar</dt><dd>' + A.fmtWaktu(p.batas_bayar) + '</dd>';
    if (p.diverifikasi_oleh) h += '<dt>Diverifikasi</dt><dd>' + esc(p.diverifikasi_oleh) + ', ' + A.fmtWaktu(p.diverifikasi_waktu) + '</dd>';
    if (p.alasan_tolak) h += '<dt>Keterangan</dt><dd>' + esc(p.alasan_tolak) + '</dd>';
    if (p.checkin_waktu) h += '<dt>Check-in</dt><dd>' + A.fmtWaktu(p.checkin_waktu) + ' (' + esc(p.checkin_oleh) + ')</dd>';
    h += '</dl></div></div>';

    h += '<div class="seksi"><h3>Bukti transfer</h3>';
    if (!bukti) h += '<p class="muted">Belum ada bukti diunggah.</p>';
    else if (bukti.error) h += '<div class="banner warn">' + esc(bukti.error) + '</div>';
    else if (bukti.mime === 'application/pdf') h += '<iframe src="data:application/pdf;base64,' + bukti.data + '" style="width:100%;height:420px;border:1px solid var(--line);border-radius:10px"></iframe>';
    else h += '<a href="data:' + esc(bukti.mime) + ';base64,' + bukti.data + '" target="_blank"><img class="bukti-img" src="data:' + esc(bukti.mime) + ';base64,' + bukti.data + '" alt="Bukti transfer"></a>';
    if (p.bukti_waktu) h += '<p class="hint">Diunggah ' + A.fmtWaktu(p.bukti_waktu) + '</p>';
    h += '</div>';

    h += '<div class="seksi"><div class="btn-grup">';
    var bisaVerif = ['menunggu_verifikasi', 'menunggu_bayar', 'ditolak', 'kedaluwarsa'].indexOf(p.status) >= 0;
    if (bisaVerif) {
      h += '<button class="btn" data-aksi="terima">✔ Terima pembayaran</button>';
      if (p.status !== 'kedaluwarsa') h += '<button class="btn bahaya" data-aksi="tolak">✖ Tolak bukti</button>';
    }
    if (p.status === 'lunas' || p.status === 'hadir') {
      h += '<a class="btn wa" target="_blank" rel="noopener" href="' + A.linkWA(p.wa, pesanTiket(p)) + '">Kirim e-tiket via WA</a>';
      h += '<a class="btn sekunder" target="_blank" href="' + A.halaman('tiket.html', { t: p.token_tiket }) + '">Buka e-tiket</a>';
    }
    if (p.status === 'menunggu_bayar') h += '<a class="btn wa" target="_blank" rel="noopener" href="' + A.linkWA(p.wa, pesanIngat(p)) + '">Ingatkan bayar via WA</a>';
    if (p.status === 'ditolak') h += '<a class="btn wa" target="_blank" rel="noopener" href="' + A.linkWA(p.wa, pesanTolak(p)) + '">Kabari via WA</a>';
    if (koor) {
      h += '<button class="btn sekunder" data-aksi="ubah">Ubah data / alihkan</button>';
      if (p.status !== 'hadir' && p.status !== 'batal') h += '<button class="btn sekunder" data-aksi="batal" style="color:var(--danger)">Batalkan</button>';
    }
    h += '</div>';
    if (p.status === 'kedaluwarsa') h += '<p class="hint">Pendaftaran ini sudah kedaluwarsa. Terima pembayaran hanya jika dana benar-benar sudah masuk ke rekening; sistem akan memeriksa sisa kuota terlebih dahulu.</p>';
    h += '<div id="panelAksi"></div></div>';
    bukaModal(h);

    $$('#modalIsi [data-aksi]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-aksi');
        if (a === 'terima') terima(p, b);
        if (a === 'tolak') panelTolak(p);
        if (a === 'ubah') panelUbah(p);
        if (a === 'batal') panelBatal(p);
      });
    });
  }

  function terima(p, btn) {
    btn.disabled = true; btn.textContent = 'Memproses…';
    apiA('verifikasi', { kode: p.kode, terima: true }).then(function (r) {
      A.toast('Pembayaran ' + p.kode + ' diterima.');
      perbaruiLokal(r.peserta);
      renderDetail(r.peserta, S.buktiDetail, '');
      $('#panelAksi').innerHTML = '<div class="banner ok" style="margin-top:12px">✔ Pembayaran diterima dan e-tiket sudah terbit. Langkah berikutnya: klik <b>Kirim e-tiket via WA</b> di atas.</div>';
    }).catch(function (e) { A.toast(e.message, true); btn.disabled = false; btn.textContent = '✔ Terima pembayaran'; });
  }

  function panelTolak(p) {
    var alasan = ['Nominal transfer tidak sesuai', 'Bukti tidak terbaca / buram', 'Dana belum masuk ke rekening', 'Bukti bukan untuk acara ini'];
    $('#panelAksi').innerHTML = '<div class="card" style="margin-top:14px;box-shadow:none"><label>Alasan penolakan</label>' +
      '<div class="chips">' + alasan.map(function (a) { return '<button class="chip" type="button" data-alasan="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>' +
      '<textarea id="alasanTolak" placeholder="Tulis alasan…"></textarea><p class="hint">Peserta mendapat tambahan waktu ' + S.batasJam + ' jam untuk mengunggah ulang.</p>' +
      '<button class="btn bahaya" id="kirimTolak">Tolak bukti</button></div>';
    $$('#panelAksi [data-alasan]').forEach(function (c) { c.addEventListener('click', function () { $('#alasanTolak').value = c.getAttribute('data-alasan'); }); });
    $('#kirimTolak').addEventListener('click', function () {
      var alasanIsi = $('#alasanTolak').value.trim();
      if (!alasanIsi) return A.toast('Isi alasan penolakan.', true);
      this.disabled = true;
      apiA('verifikasi', { kode: p.kode, terima: false, alasan: alasanIsi }).then(function (r) {
        perbaruiLokal(r.peserta);
        renderDetail(r.peserta, S.buktiDetail, '');
        $('#panelAksi').innerHTML = '<div class="banner warn" style="margin-top:12px">Bukti ditolak. Langkah berikutnya: klik <b>Kabari via WA</b> di atas agar peserta mengunggah ulang.</div>';
      }).catch(function (e) { A.toast(e.message, true); });
    });
  }

  function panelUbah(p) {
    var orang = A.daftarOrang(p);
    var jkPilih = function (i, v) {
      return '<select class="uJK" data-i="' + i + '" style="max-width:160px"><option value="">Jenis kelamin…</option>' +
        '<option value="L"' + (v === 'L' ? ' selected' : '') + '>Laki-laki</option><option value="P"' + (v === 'P' ? ' selected' : '') + '>Perempuan</option></select>';
    };
    var h = '<div class="card" style="margin-top:14px;box-shadow:none"><h3>Ubah data / alihkan tiket</h3>' +
      '<p class="hint">Untuk koreksi nama sertifikat atau mengalihkan tiket ke orang lain. Perubahan tercatat di Log.</p>' +
      '<label>' + (p.orang > 2 ? 'Penanggung jawab' : 'Nama pendaftar') + '</label><div class="baris-isi"><input type="text" id="uNama" value="' + esc(p.nama) + '">' + jkPilih(0, orang[0].jk) + '</div>';
    for (var i = 1; i < orang.length; i++) {
      h += '<label>' + esc(orang[i].peran) + '</label><div class="baris-isi"><input type="text" class="uAnggota" value="' + esc(orang[i].nama) + '">' + jkPilih(i, orang[i].jk) + '</div>';
    }
    h += '<div class="grid2"><div><label>Nomor WA</label><input type="tel" id="uWa" value="' + esc(p.wa) + '"></div>' +
      '<div><label>Email</label><input type="email" id="uEmail" value="' + esc(p.email) + '"></div>' +
      '<div><label>Asal</label><input type="text" id="uAsal" list="daftarAsalAdmin" value="' + esc(p.asal) + '" placeholder="Pilih dari daftar atau Lainnya: …">' +
      '<datalist id="daftarAsalAdmin">' + (S.asal || []).map(function (a) { return '<option value="' + esc(a) + '">'; }).join('') + '</datalist>' +
      '<div class="hint">Isi persis seperti pilihan di daftar, atau awali dengan "Lainnya: ".</div></div></div>' +
      '<button class="btn" id="simpanUbah" style="margin-top:14px">Simpan perubahan</button></div>';
    $('#panelAksi').innerHTML = h;
    $('#simpanUbah').addEventListener('click', function () {
      this.disabled = true;
      apiA('ubahData', { kode: p.kode, data: {
        nama: $('#uNama').value, wa: $('#uWa').value, email: $('#uEmail').value, asal: $('#uAsal').value,
        anggota: $$('.uAnggota').map(function (i) { return i.value; }),
        jenis_kelamin: $$('.uJK').map(function (s) { return s.value; })
      } })
        .then(function (r) { A.toast('Data tersimpan.'); perbaruiLokal(r.peserta); bukaDetail(p.kode); })
        .catch(function (e) { A.toast(e.message, true); $('#simpanUbah').disabled = false; });
    });
  }

  function panelBatal(p) {
    $('#panelAksi').innerHTML = '<div class="card" style="margin-top:14px;box-shadow:none"><h3>Batalkan pendaftaran</h3>' +
      '<p class="hint">Kuota akan dilepas. ' + ((p.status === 'lunas') ? '<b>Peserta ini sudah lunas</b>; pastikan urusan refund sudah disepakati.' : '') + '</p>' +
      '<label>Keterangan</label><input type="text" id="bAlasan" placeholder="Misalnya: permintaan peserta">' +
      '<button class="btn bahaya" id="kirimBatal" style="margin-top:12px">Ya, batalkan</button></div>';
    $('#kirimBatal').addEventListener('click', function () {
      this.disabled = true;
      apiA('batalkan', { kode: p.kode, alasan: $('#bAlasan').value }).then(function (r) {
        A.toast('Pendaftaran dibatalkan.'); perbaruiLokal(r.peserta); tutupModal();
      }).catch(function (e) { A.toast(e.message, true); });
    });
  }

  // ---------------- Cocokkan mutasi ----------------
  function keRupiah(s) {
    s = String(s).replace(/rp/i, '').replace(/\s/g, '');
    var m;
    if ((m = s.match(/^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/))) return parseInt(m[1].replace(/\./g, ''), 10);
    if ((m = s.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/))) return parseInt(m[1].replace(/,/g, ''), 10);
    if ((m = s.match(/^(\d+)(?:[.,](\d{1,2}))?$/))) return parseInt(m[1], 10);
    return null;
  }

  function pecahCSV(baris) {
    var out = [], cur = '', kutip = false;
    for (var i = 0; i < baris.length; i++) {
      var ch = baris[i];
      if (ch === '"') { if (kutip && baris[i + 1] === '"') { cur += '"'; i++; } else kutip = !kutip; }
      else if ((ch === ',' || ch === ';' || ch === '\t') && !kutip) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /** Mengambil semua kandidat nominal dari satu baris mutasi */
  function kandidatNominal(baris) {
    var set = {};
    // 1) per kolom (CSV/tab/titik koma)
    pecahCSV(baris).forEach(function (sel) {
      var bersih = sel.trim().replace(/\s*(CR|DB|K|D)$/i, '');
      var n = keRupiah(bersih);
      if (n !== null) set[n] = true;
    });
    // 2) pola angka di seluruh baris (untuk teks yang ditempel)
    var re = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g, m;
    while ((m = re.exec(baris))) { var n2 = keRupiah(m[0]); if (n2 !== null) set[n2] = true; }
    return Object.keys(set).map(Number).filter(function (n) { return n >= 1000; });
  }

  function prosesMutasi(teks) {
    var petaNominal = {};
    S.peserta.forEach(function (p) {
      if (p.status === 'batal') return;
      (petaNominal[p.nominal] = petaNominal[p.nominal] || []).push(p);
    });
    var hasil = [], sudahDipakai = {};
    teks.split(/\r?\n/).forEach(function (baris) {
      if (!baris.trim()) return;
      // Lewati baris debit (uang keluar) jika ada penanda
      if (/\b(DB|DEBET|DEBIT)\b/i.test(baris) && !/\b(CR|KREDIT|CREDIT)\b/i.test(baris)) return;
      kandidatNominal(baris).forEach(function (n) {
        var cocok = petaNominal[n];
        if (!cocok) return;
        var kunciDup = n + '|' + baris;
        if (sudahDipakai[kunciDup]) return;
        sudahDipakai[kunciDup] = true;
        var tertunda = cocok.filter(function (p) { return p.status !== 'lunas' && p.status !== 'hadir'; });
        var ket, pilih = false, p = null;
        if (tertunda.length === 1) {
          p = tertunda[0]; pilih = true;
          ket = p.status === 'kedaluwarsa' ? 'Cocok, tapi sudah kedaluwarsa (cek kuota)' : 'Cocok';
          if (p.status === 'kedaluwarsa') pilih = false;
        } else if (tertunda.length > 1) {
          ket = 'Ambigu: ' + tertunda.map(function (x) { return x.kode; }).join(', ') + ' — cek manual';
        } else {
          p = cocok[0]; ket = 'Sudah lunas';
        }
        hasil.push({ baris: baris.trim(), nominal: n, p: p, ket: ket, pilih: pilih });
      });
    });
    // Satu peserta hanya dicentang sekali
    var dicentang = {};
    hasil.forEach(function (h) {
      if (h.pilih && h.p) { if (dicentang[h.p.kode]) { h.pilih = false; h.ket = 'Duplikat di mutasi'; } dicentang[h.p.kode] = true; }
    });
    return hasil;
  }

  function renderMutasi() {
    var hs = S.hasilMutasi;
    if (!hs.length) {
      $('#mHasil').innerHTML = '<div class="banner warn">Tidak ada nominal yang cocok dengan pendaftar. Pastikan file/teks mutasi benar dan data peserta sudah dimuat ulang.</div>';
      return;
    }
    var h = '<div class="card"><h2>Hasil pencocokan (' + hs.length + ')</h2><div class="tabel-wrap"><table><thead><tr><th></th><th class="angka">Nominal</th><th>Peserta</th><th>Status</th><th>Keterangan</th><th>Baris mutasi</th></tr></thead><tbody>';
    hs.forEach(function (x, i) {
      var bisa = x.p && x.p.status !== 'lunas' && x.p.status !== 'hadir' && x.ket.indexOf('Ambigu') !== 0;
      h += '<tr><td>' + (bisa ? '<input type="checkbox" data-i="' + i + '"' + (x.pilih ? ' checked' : '') + '>' : '') + '</td>' +
        '<td class="angka"><b>' + A.rupiah(x.nominal) + '</b></td>' +
        '<td>' + (x.p ? '<b>' + esc(x.p.kode) + '</b><br>' + esc(x.p.nama) : '-') + '</td>' +
        '<td>' + (x.p ? A.badge(x.p.status) : '') + '</td><td>' + esc(x.ket) + '</td>' +
        '<td><small class="muted">' + esc(x.baris.slice(0, 120)) + '</small></td></tr>';
    });
    h += '</tbody></table></div><div class="btn-grup" style="margin-top:14px"><button class="btn" id="mVerif">Verifikasi yang dicentang</button></div></div>';
    $('#mHasil').innerHTML = h;
    $('#mVerif').addEventListener('click', verifMassal);
  }

  $('#mProses').addEventListener('click', function () {
    var btn = this;
    var f = $('#mFile').files[0];
    var lanjut = function (teks) {
      btn.disabled = true;
      muatPeserta(true).then(function () {
        S.hasilMutasi = prosesMutasi(teks + '\n' + $('#mTeks').value);
        renderMutasi();
      }).then(function () { btn.disabled = false; });
    };
    if (f) { var fr = new FileReader(); fr.onload = function () { lanjut(String(fr.result)); }; fr.readAsText(f); }
    else if ($('#mTeks').value.trim()) lanjut('');
    else A.toast('Pilih file atau tempel teks mutasi dulu.', true);
  });

  function verifMassal() {
    var kodes = $$('#mHasil input[type=checkbox]:checked').map(function (c) { return S.hasilMutasi[+c.getAttribute('data-i')].p.kode; });
    if (!kodes.length) return A.toast('Belum ada yang dicentang.', true);
    if (!confirm('Verifikasi ' + kodes.length + ' pembayaran sebagai LUNAS?')) return;
    var btn = $('#mVerif'); btn.disabled = true; btn.textContent = 'Memproses ' + kodes.length + ' data…';
    apiA('verifikasiMassal', { kodes: kodes }).then(function (r) {
      var okList = r.hasil.filter(function (x) { return x.ok; }), gagal = r.hasil.filter(function (x) { return !x.ok; });
      okList.forEach(function (x) { perbaruiLokal(x.peserta); });
      var h = '<div class="card"><div class="banner ok">' + okList.length + ' pembayaran diverifikasi.' + (gagal.length ? ' ' + gagal.length + ' gagal.' : '') + '</div>';
      if (gagal.length) h += '<div class="banner danger">' + gagal.map(function (g) { return esc(g.kode) + ': ' + esc(g.error); }).join('<br>') + '</div>';
      if (okList.length) {
        h += '<h3>Kirim e-tiket via WhatsApp</h3><p class="hint">Klik satu per satu; tombol berubah setelah diklik.</p><div class="tabel-wrap"><table><tbody>';
        okList.forEach(function (x) {
          h += '<tr><td><b>' + esc(x.peserta.kode) + '</b></td><td>' + esc(x.peserta.nama) + '</td><td><a class="btn wa kecil kirimWa" target="_blank" rel="noopener" href="' + A.linkWA(x.peserta.wa, pesanTiket(x.peserta)) + '">Kirim via WA</a></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';
      $('#mHasil').innerHTML = h;
      $$('#mHasil .kirimWa').forEach(function (a) { a.addEventListener('click', function () { a.classList.remove('wa'); a.classList.add('sekunder'); a.textContent = '✔ Dibuka'; }); });
    }).catch(function (e) { A.toast(e.message, true); btn.disabled = false; btn.textContent = 'Verifikasi yang dicentang'; });
  }

  // ---------------- Pengaturan ----------------
  function muatPengaturan() {
    $('#pIsi').innerHTML = A.memuat('Memuat pengaturan…');
    apiA('getPengaturan').then(function (r) { S.pengaturan = r; renderPengaturan(); })
      .catch(function (e) { $('#pIsi').innerHTML = '<div class="banner danger">' + esc(e.message) + '</div>'; });
  }

  function geserTanggal(str, bulan, hari, jamTetap) {
    var m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return '';
    var y = +m[1], mo = +m[2] - 1 + bulan, d = +m[3];
    var dt = new Date(Date.UTC(y, mo, d, +m[4], +m[5]));
    if (bulan && dt.getUTCDate() !== d) dt = new Date(Date.UTC(y, mo + 1, 0, +m[4], +m[5])); // akhir bulan
    if (hari) dt = new Date(dt.getTime() + hari * 86400000);
    var p2 = function (n) { return ('0' + n).slice(-2); };
    var jam = jamTetap || (p2(dt.getUTCHours()) + ':' + p2(dt.getUTCMinutes()));
    return dt.getUTCFullYear() + '-' + p2(dt.getUTCMonth() + 1) + '-' + p2(dt.getUTCDate()) + 'T' + jam;
  }
  function otoBuka(acara) { return geserTanggal(acara, -1, 0); }
  function otoTutup(acara) { return geserTanggal(acara, 0, -3, '23:59'); }

  function renderPengaturan() {
    var c = S.pengaturan.config, t = S.pengaturan.terpakai;
    var f = function (k, label, tipe, attr, hint) {
      return '<label for="c_' + k + '">' + label + '</label><input id="c_' + k + '" data-k="' + k + '" type="' + (tipe || 'text') + '" value="' + esc(c[k]) + '" ' + (attr || '') + '>' + (hint ? '<div class="hint">' + hint + '</div>' : '');
    };
    var h = '';
    h += '<div class="card"><h2>A. Info & jadwal acara</h2><div class="grid2">';
    h += '<div>' + f('nama_acara', 'Nama acara') + '</div>';
    h += '<div>' + f('tanggal_acara', 'Tanggal & jam acara', 'datetime-local') + '</div>';
    h += '</div><label for="c_deskripsi">Deskripsi</label><textarea id="c_deskripsi" data-k="deskripsi">' + esc(c.deskripsi) + '</textarea><div class="grid2">';
    h += '<div>' + f('lokasi', 'Lokasi') + '</div>';
    h += '<div>' + f('link_maps', 'Link Google Maps', 'text', 'placeholder="https://maps.app.goo.gl/…"') + '</div>';
    h += '<div>' + f('buka', 'Pendaftaran dibuka', 'datetime-local', '', 'Otomatis 1 bulan sebelum acara saat tanggal acara diubah. Boleh disesuaikan.') + '</div>';
    h += '<div>' + f('tutup', 'Pendaftaran ditutup', 'datetime-local', '', 'Otomatis H-3 pukul 23:59. Boleh disesuaikan.') + '</div>';
    h += '<div>' + f('early_bird_akhir', 'Early bird berakhir', 'date', '', 'Kosongkan jika tanpa early bird.') + '</div>';
    h += '<div>' + f('batas_bayar_jam', 'Batas waktu bayar (jam)', 'number', 'min="1"') + '</div>';
    h += '<div>' + f('kontak_wa', 'Nomor WA panitia (bantuan)', 'tel', 'placeholder="08…"') + '</div>';
    h += '</div></div>';

    h += '<div class="card"><h2>Formulir pendaftaran</h2>' +
      '<label for="c_asal_daftar">Pilihan asal peserta <span class="opsional">(satu per baris)</span></label>' +
      '<textarea id="c_asal_daftar" data-k="asal_daftar" style="min-height:130px" placeholder="Contoh:&#10;SAI Unit A&#10;SAI Unit B&#10;Komunitas lain&#10;Umum">' + esc(String(c.asal_daftar || '').split('|').join('\n')) + '</textarea>' +
      '<div class="hint">Pilihan <b>Lainnya…</b> (dengan isian bebas) otomatis ditambahkan di akhir. Kosongkan jika pertanyaan asal tidak diperlukan.</div>' +
      '<label class="cek" style="margin-top:16px"><input type="checkbox" id="c_pertanyaan_aktif"' + (c.pertanyaan_aktif !== 'tidak' ? ' checked' : '') + '> <span>Tampilkan kolom <b>Pertanyaan atau topik yang ingin dibahas</b> (opsional untuk peserta). Jika dimatikan, kolom ini hilang dari formulir.</span></label>' +
      '<label for="c_catatan_nama">Catatan penulisan nama</label>' +
      '<textarea id="c_catatan_nama" data-k="catatan_nama">' + esc(c.catatan_nama) + '</textarea>' +
      '<div class="hint">Muncul di bawah kolom nama. Bisa ditambah aturan gelar atau tenggat koreksi nama, misalnya "Tanpa gelar. Koreksi nama paling lambat H-3".</div></div>';
    h += '<div class="card"><h2>B. Jenis tiket & harga</h2>';
    h += '<div class="grid2"><div>' + f('kapasitas_total', 'Kapasitas total (orang)', 'number', 'min="1"', 'Sudah terdaftar: <b>' + t.orang + ' orang</b>') + '</div><div id="cekKapasitas" style="padding-top:38px"></div></div>';
    h += '<div class="tabel-wrap" style="margin-top:14px"><table><thead><tr><th>Nama tiket &amp; keterangan</th><th>Harga normal</th><th>Harga early bird</th><th>Orang/tiket</th><th>Kuota (tiket)</th><th class="angka">Kursi</th><th>Terjual*</th><th>VIP</th><th>Aktif</th><th></th></tr></thead><tbody id="tbJenis"></tbody></table></div>';
    h += '<p class="hint">Harga berlaku per tiket. Kursi = kuota × orang per tiket (contoh: tiket Grup 5 orang dengan kuota 20 = 100 kursi). Centang <b>VIP</b> agar tiket ditandai khusus di formulir, e-tiket, dashboard, dan saat check-in.<br>*Termasuk yang masih menunggu pembayaran. Jenis tiket yang sudah ada pendaftarnya tidak bisa dihapus, cukup dinonaktifkan.</p>';
    h += '<button class="btn sekunder kecil" id="tambahJenis">+ Tambah jenis tiket</button></div>';

    h += '<div class="card"><h2>C. Penitipan anak</h2>';
    h += '<label class="cek"><input type="checkbox" id="c_penitipan_aktif"' + (c.penitipan_aktif === 'ya' ? ' checked' : '') + '> <span>Aktifkan penitipan anak (jika dimatikan, pertanyaan ini hilang dari formulir)</span></label><div class="grid2">';
    h += '<div>' + f('penitipan_kapasitas', 'Kapasitas (jumlah anak)', 'number', 'min="0"', 'Sudah terdaftar: <b>' + t.anak + ' anak</b>') + '</div>';
    h += '<div>' + f('penitipan_biaya', 'Biaya per anak (Rp, 0 = gratis)', 'number', 'min="0"') + '</div>';
    h += '<div>' + f('penitipan_usia_min', 'Usia minimal (tahun)', 'number', 'min="0"') + '</div>';
    h += '<div>' + f('penitipan_usia_maks', 'Usia maksimal (tahun)', 'number', 'min="0"') + '</div>';
    h += '<div>' + f('penitipan_maks_per_pendaftar', 'Maksimal anak per pendaftar', 'number', 'min="1"') + '</div>';
    h += '</div></div>';

    h += '<div class="card"><h2>D. Pembayaran</h2><div class="grid2">';
    h += '<div><label for="c_bank">Bank</label><select id="c_bank" data-k="bank"><option' + (c.bank === 'BCA' ? ' selected' : '') + '>BCA</option><option' + (c.bank === 'Mandiri' ? ' selected' : '') + '>Mandiri</option></select><div class="hint">Juga menentukan format mutasi yang dicocokkan.</div></div>';
    h += '<div>' + f('no_rekening', 'Nomor rekening', 'text', 'inputmode="numeric"') + '</div>';
    h += '<div>' + f('atas_nama', 'Atas nama') + '</div>';
    h += '</div></div>';

    h += '<div class="card" style="position:sticky;bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">';
    h += '<button class="btn" id="simpanPengaturan">Simpan pengaturan</button><button class="btn sekunder" id="pratinjauForm">Pratinjau formulir</button>';
    h += '<span class="hint" id="pPesan"></span></div>';
    $('#pIsi').innerHTML = h;

    S.jenisEdit = S.pengaturan.jenis_tiket.map(function (j) { return Object.assign({}, j); });
    renderJenis();

    var elAcara = $('#c_tanggal_acara');
    elAcara.dataset.lama = elAcara.value;
    elAcara.addEventListener('change', function () {
      var lama = elAcara.dataset.lama, baru = elAcara.value;
      var b = $('#c_buka'), t2 = $('#c_tutup'), diubah = [];
      if (!b.value || b.value === otoBuka(lama)) { b.value = otoBuka(baru); diubah.push('buka'); }
      if (!t2.value || t2.value === otoTutup(lama)) { t2.value = otoTutup(baru); diubah.push('tutup'); }
      elAcara.dataset.lama = baru;
      if (diubah.length) A.toast('Tanggal ' + diubah.join(' & ') + ' pendaftaran disesuaikan otomatis.');
      else A.toast('Tanggal buka/tutup sudah diatur manual, jadi tidak diubah. Periksa kembali.');
    });
    $('#c_kapasitas_total').addEventListener('input', cekKapasitas);
    $('#tambahJenis').addEventListener('click', function () {
      S.jenisEdit.push({ id: '', nama: '', harga_normal: 0, harga_eb: 0, orang: 1, kuota: 0, aktif: true, vip: false, keterangan: '', terpakai: 0 });
      renderJenis();
    });
    $('#simpanPengaturan').addEventListener('click', simpanPengaturan);
    $('#pratinjauForm').addEventListener('click', pratinjau);
  }

  function renderJenis() {
    $('#tbJenis').innerHTML = S.jenisEdit.map(function (j, i) {
      return '<tr data-i="' + i + '"><td style="min-width:220px"><input type="text" data-f="nama" value="' + esc(j.nama) + '" placeholder="Nama tiket">' +
        '<input type="text" data-f="keterangan" value="' + esc(j.keterangan || '') + '" placeholder="Keterangan/benefit (opsional)" style="margin-top:6px;font-size:.85rem"></td>' +
        '<td><input type="number" data-f="harga_normal" value="' + (j.harga_normal || '') + '" min="0" style="width:120px"></td>' +
        '<td><input type="number" data-f="harga_eb" value="' + (j.harga_eb || '') + '" min="0" style="width:120px" placeholder="opsional"></td>' +
        '<td><input type="number" data-f="orang" value="' + j.orang + '" min="1" max="10" style="width:70px"' + (j.terpakai ? ' disabled title="Tidak bisa diubah, sudah ada pendaftar"' : '') + '></td>' +
        '<td><input type="number" data-f="kuota" value="' + (j.kuota || '') + '" min="' + j.terpakai + '" style="width:90px"></td>' +
        '<td class="angka kursi">' + ((j.kuota || 0) * (j.orang || 1)) + '</td>' +
        '<td class="angka">' + j.terpakai + '</td>' +
        '<td><input type="checkbox" data-f="vip"' + (j.vip ? ' checked' : '') + '></td>' +
        '<td><input type="checkbox" data-f="aktif"' + (j.aktif ? ' checked' : '') + '></td>' +
        '<td>' + (j.terpakai ? '' : '<button class="btn sekunder kecil" data-hapus="' + i + '" type="button">Hapus</button>') + '</td></tr>';
    }).join('');
    $$('#tbJenis [data-f]').forEach(function (el) {
      el.addEventListener('input', function () {
        var i = +el.closest('tr').getAttribute('data-i'), fld = el.getAttribute('data-f');
        var v = el.type === 'checkbox' ? el.checked : el.value;
        if (fld === 'harga_normal' || fld === 'harga_eb' || fld === 'kuota' || fld === 'orang') v = Number(v) || 0;
        S.jenisEdit[i][fld] = v;
        var jj = S.jenisEdit[i];
        el.closest('tr').querySelector('.kursi').textContent = (jj.kuota || 0) * (jj.orang || 1);
        cekKapasitas();
      });
      if (el.type === 'checkbox' || el.tagName === 'SELECT') el.addEventListener('change', function () { el.dispatchEvent(new Event('input')); });
    });
    $$('#tbJenis [data-hapus]').forEach(function (b) {
      b.addEventListener('click', function () { S.jenisEdit.splice(+b.getAttribute('data-hapus'), 1); renderJenis(); });
    });
    cekKapasitas();
  }

  function cekKapasitas() {
    var kap = Number($('#c_kapasitas_total').value) || 0;
    var kursi = S.jenisEdit.filter(function (j) { return j.aktif; }).reduce(function (s, j) { return s + (j.kuota || 0) * (j.orang || 1); }, 0);
    $('#cekKapasitas').innerHTML = kursi > kap
      ? '<div class="banner warn" style="margin:0">Total kursi dari kuota tiket aktif: <b>' + kursi + ' orang</b>, melebihi kapasitas ' + kap + '. Penjualan akan berhenti otomatis saat kapasitas penuh.</div>'
      : '<div class="banner ok" style="margin:0">Total kursi dari kuota tiket aktif: <b>' + kursi + ' orang</b> (kapasitas ' + kap + ').</div>';
  }

  function kumpulkanPengaturan() {
    var c = {};
    $$('#pIsi [data-k]').forEach(function (el) { c[el.getAttribute('data-k')] = el.value; });
    c.penitipan_aktif = $('#c_penitipan_aktif').checked ? 'ya' : 'tidak';
    c.pertanyaan_aktif = $('#c_pertanyaan_aktif').checked ? 'ya' : 'tidak';
    return { config: c, jenis_tiket: S.jenisEdit.map(function (j) { return { id: j.id, nama: j.nama, harga_normal: j.harga_normal, harga_eb: j.harga_eb, orang: j.orang, kuota: j.kuota, aktif: !!j.aktif, vip: !!j.vip, keterangan: j.keterangan || '' }; }) };
  }

  function simpanPengaturan() {
    var d = kumpulkanPengaturan();
    var lama = S.pengaturan.config;
    if (d.config.bank !== lama.bank && S.pengaturan.terpakai.pending > 0) {
      if (!confirm('Masih ada ' + S.pengaturan.terpakai.pending + ' pendaftar yang belum selesai membayar ke rekening ' + lama.bank + '.\n\nMereka tetap diarahkan ke rekening lama; pendaftar baru akan diarahkan ke ' + d.config.bank + '. Lanjutkan?')) return;
    }
    var btn = $('#simpanPengaturan'); btn.disabled = true; btn.textContent = 'Menyimpan…';
    apiA('simpanPengaturan', d).then(function (r) {
      A.toast(r.pesan);
      return apiA('me').then(function (me) {
        S.bank = me.bank; S.acara = me.acara; S.batasJam = me.batas_bayar_jam; S.asal = me.asal || [];
        $('#mBank').textContent = S.bank; $('#judulAcara').textContent = S.acara.nama_acara;
      }).then(muatPengaturan);
    }).catch(function (e) {
      A.toast(e.message, true);
      $('#pPesan').innerHTML = '<span style="color:var(--danger)">' + esc(e.message) + '</span>';
      btn.disabled = false; btn.textContent = 'Simpan pengaturan';
    });
  }

  function pratinjau() {
    var d = kumpulkanPengaturan(), c = d.config, t = S.pengaturan.terpakai;
    var akhirEB = A.keDate(c.early_bird_akhir ? c.early_bird_akhir + 'T23:59' : '');
    var eb = !!akhirEB && new Date() <= akhirEB;
    var data = {
      acara: { nama_acara: c.nama_acara, deskripsi: c.deskripsi, tanggal_acara: c.tanggal_acara, lokasi: c.lokasi, link_maps: c.link_maps, kontak_wa: c.kontak_wa },
      status: 'buka', buka: c.buka, tutup: c.tutup, early_bird: eb, early_bird_akhir: c.early_bird_akhir,
      batas_bayar_jam: Number(c.batas_bayar_jam) || 24,
      asal: String(c.asal_daftar || '').split(/[\n|]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.toLowerCase() !== 'lainnya'; }),
      catatan_nama: c.catatan_nama,
      pertanyaan_aktif: c.pertanyaan_aktif === 'ya',
      tiket: S.jenisEdit.filter(function (j) { return j.aktif; }).map(function (j) {
        return { id: j.id || ('baru' + Math.random()), nama: j.nama, orang: j.orang, vip: !!j.vip, keterangan: j.keterangan || '', harga: (eb && j.harga_eb) ? j.harga_eb : j.harga_normal, harga_normal: j.harga_normal, sisa: Math.max(0, j.kuota - j.terpakai) };
      }),
      penitipan: {
        aktif: c.penitipan_aktif === 'ya', sisa: Math.max(0, Number(c.penitipan_kapasitas) - t.anak),
        usia_min: Number(c.penitipan_usia_min), usia_maks: Number(c.penitipan_usia_maks),
        biaya: Number(c.penitipan_biaya), maks: Number(c.penitipan_maks_per_pendaftar)
      }
    };
    A.simpan('ws_pratinjau', data);
    window.open('index.html?pratinjau=1', '_blank');
  }

  // ---------------- Log ----------------
  function muatLog() {
    $('#tbLog').innerHTML = '<tr><td colspan="5">' + A.memuat() + '</td></tr>';
    apiA('log').then(function (r) {
      $('#tbLog').innerHTML = r.log.length ? r.log.map(function (l) {
        return '<tr><td><small>' + A.fmtWaktu(l.waktu) + '</small></td><td>' + esc(l.admin) + '</td><td>' + esc(l.aksi) + '</td><td>' + esc(l.kode) + '</td><td style="white-space:pre-line"><small>' + esc(l.detail) + '</small></td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">Belum ada log.</td></tr>';
    }).catch(function (e) { A.toast(e.message, true); });
  }
  $('#btnLog').addEventListener('click', muatLog);

  mulai();
})();
