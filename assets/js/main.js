import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5SmScxfhRunQW5_dU4QyhyGvKe3Pp5yc",
  authDomain: "keuangan-ku-a0a62.firebaseapp.com",
  projectId: "keuangan-ku-a0a62",
  storageBucket: "keuangan-ku-a0a62.firebasestorage.app",
  messagingSenderId: "400209904843",
  appId: "1:400209904843:web:21479af3c02ec5992fc74e",
  measurementId: "G-84K28W52EP",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let dataSnapshotGlobal = null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appContent = document.getElementById("app-content");
const summarySection = document.getElementById("summary-section");
const filterSection = document.getElementById("filter-section");
const userInfo = document.getElementById("userInfo");

const filterType = document.getElementById("filter-type");
const filterDate = document.getElementById("filter-date");
const filterMonth = document.getElementById("filter-month");

loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, new GoogleAuthProvider()).catch((error) =>
    console.error("Login Error:", error),
  );
});

logoutBtn.addEventListener("click", () => {
  signOut(auth).catch((error) => console.error("Logout Error:", error));
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    appContent.style.display = "grid";
    summarySection.style.display = "grid";
    filterSection.style.display = "flex";
    userInfo.textContent = `Halo, ${user.displayName} | `;
    muatData();
  } else {
    currentUser = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    appContent.style.display = "none";
    summarySection.style.display = "none";
    filterSection.style.display = "none";
    userInfo.textContent = "";
  }
});

filterType.addEventListener("change", () => {
  if (filterType.value === "semua") {
    filterDate.style.display = "none";
    filterMonth.style.display = "none";
  } else if (filterType.value === "harian") {
    filterDate.style.display = "inline-block";
    filterMonth.style.display = "none";
  } else if (filterType.value === "bulanan") {
    filterDate.style.display = "none";
    filterMonth.style.display = "inline-block";
  }
  prosesDanTampilkanData();
});

filterDate.addEventListener("change", prosesDanTampilkanData);
filterMonth.addEventListener("change", prosesDanTampilkanData);

window.tambahData = async function (tipe) {
  if (!currentUser) return alert("Silakan login dulu!");

  const dateInput = document.getElementById(`date-${tipe}`).value;
  const nomInput = document.getElementById(`nom-${tipe}`).value;
  const ketInput = document.getElementById(`ket-${tipe}`).value;
  const katElement = document.getElementById(`kat-${tipe}`);
  const katInput = katElement ? katElement.value : "-";

  if (!dateInput || !nomInput || !ketInput)
    return alert("Harap isi semua kolom!");

  try {
    await addDoc(collection(db, "transaksi"), {
      uid: currentUser.uid,
      tipe: tipe,
      tanggal: dateInput,
      nominal: parseInt(nomInput),
      uraian: ketInput,
      kategori: katInput,
      timestamp: new Date(),
    });
    document.getElementById(`nom-${tipe}`).value = "";
    document.getElementById(`ket-${tipe}`).value = "";
  } catch (e) {
    console.error("Error menambahkan data: ", e);
  }
};

window.hapusData = async function (id) {
  if (confirm("Apakah Anda yakin ingin menghapus data transaksi ini?")) {
    try {
      await deleteDoc(doc(db, "transaksi", id));
    } catch (e) {
      console.error("Error menghapus data: ", e);
    }
  }
};

window.editData = async function (id, nominalLama, uraianLama) {
  const baruNominal = prompt("Masukkan nominal baru:", nominalLama);
  const baruUraian = prompt("Masukkan uraian baru:", uraianLama);

  if (baruNominal && baruUraian) {
    try {
      await updateDoc(doc(db, "transaksi", id), {
        nominal: parseInt(baruNominal),
        uraian: baruUraian,
      });
    } catch (e) {
      console.error("Error memperbarui data: ", e);
    }
  }
};

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function muatData() {
  if (!currentUser) return;

  const q = query(
    collection(db, "transaksi"),
    where("uid", "==", currentUser.uid),
    orderBy("timestamp", "asc"),
  );

  onSnapshot(
    q,
    (snapshot) => {
      dataSnapshotGlobal = snapshot;
      prosesDanTampilkanData();
    },
    (error) => {
      console.error("Gagal memuat data Firestore:", error);
    },
  );
}

function prosesDanTampilkanData() {
  if (!dataSnapshotGlobal) return;

  const dataPendapatan = document.getElementById("table-pendapatan");
  const dataPengeluaran = document.getElementById("table-pengeluaran");
  const dataRencana = document.getElementById("table-rencana");

  dataPendapatan.innerHTML = "";
  dataPengeluaran.innerHTML = "";
  dataRencana.innerHTML = "";

  let totalPendapatan = 0;
  let totalPengeluaran = 0;
  let totalRencana = 0;

  // Variabel penampung total per kategori
  let totalPerKategori = {
    pendapatan: {},
    pengeluaran: {},
    rencana: {},
  };

  const tipeFilter = filterType.value;
  const nilaiTanggal = filterDate.value;
  const nilaiBulan = filterMonth.value;

  dataSnapshotGlobal.forEach((documentDoc) => {
    const dt = documentDoc.data();
    const docId = documentDoc.id;

    if (tipeFilter === "harian" && nilaiTanggal && dt.tanggal !== nilaiTanggal)
      return;
    if (
      tipeFilter === "bulanan" &&
      nilaiBulan &&
      !dt.tanggal.startsWith(nilaiBulan)
    )
      return;

    const row = `<tr>
                        <td>${dt.tanggal}</td>
                        <td>${formatRupiah(dt.nominal)}</td>
                        <td>${dt.uraian}</td>
                        <td>${dt.kategori}</td>
                        <td>
                          <button class="btn-edit" onclick="editData('${docId}', ${dt.nominal}, '${dt.uraian}')"><i class="fa-solid fa-pen-to-square"></i></button>
                          <button class="btn-delete" onclick="hapusData('${docId}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`;

    // Akumulasi total utama dan total kategori
    if (dt.tipe === "pendapatan") {
      dataPendapatan.innerHTML += row;
      totalPendapatan += dt.nominal;
    } else if (dt.tipe === "pengeluaran") {
      dataPengeluaran.innerHTML += row;
      totalPengeluaran += dt.nominal;
    } else if (dt.tipe === "rencana") {
      dataRencana.innerHTML += row;
      totalRencana += dt.nominal;
    }

    // Hitung total spesifik per kategori
    if (!totalPerKategori[dt.tipe][dt.kategori]) {
      totalPerKategori[dt.tipe][dt.kategori] = 0;
    }
    totalPerKategori[dt.tipe][dt.kategori] += dt.nominal;
  });

  // Tampilkan Total per Kategori ke Elemen HTML Masing-masing
  const tipeTransaksi = ["pendapatan", "pengeluaran", "rencana"];
  tipeTransaksi.forEach((tipe) => {
    const containerKategori = document.getElementById(`cat-total-${tipe}`);
    containerKategori.innerHTML = "<h5>Total per Kategori:</h5>";

    const daftarKategori = totalPerKategori[tipe];
    if (Object.keys(daftarKategori).length === 0) {
      containerKategori.innerHTML +=
        "<div style='color:#888; text-align:center;'>Belum ada data</div>";
    } else {
      for (const [namaKategori, nominalKategori] of Object.entries(
        daftarKategori,
      )) {
        containerKategori.innerHTML += `
                <div class="category-item">
                  <span>${namaKategori}</span>
                  <strong>${formatRupiah(nominalKategori)}</strong>
                </div>`;
      }
    }
  });

  const sisaPengeluaran = totalPendapatan - totalPengeluaran;
  const sisaRencana = totalPendapatan - totalRencana;

  document.getElementById("tot-pendapatan").textContent =
    formatRupiah(totalPendapatan);
  document.getElementById("tot-pengeluaran").textContent =
    formatRupiah(totalPengeluaran);
  document.getElementById("tot-rencana").textContent =
    formatRupiah(totalRencana);

  document.getElementById("tot-sisa-pengeluaran").textContent =
    formatRupiah(sisaPengeluaran);
  document.getElementById("tot-sisa-rencana").textContent =
    formatRupiah(sisaRencana);
}
