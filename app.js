// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyBzWNEqp5z4NWC-9tEOjSMO8CLQKKGfSOY",
    authDomain: "inspection-a99de.firebaseapp.com",
    projectId: "inspection-a99de",
    storageBucket: "inspection-a99de.appspot.com",
    messagingSenderId: "1048779389002",
    appId: "1:1048779389002:web:b09892b9c9d31674054eb3"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// クライアントごとの列インデックス設定
const clientSettings = {
    clientA: {
        picking_id: 0,
        user_id: 1,
        item_id: 2,
        status: 3,
        inspection_date: 4,
        created_at: 5
    },
    clientB: {
        picking_id: 1,
        user_id: 2,
        item_id: 0,
        status: 4,
        inspection_date: 5,
        created_at: 3
    },
    // 他のクライアントの設定も同様に追加
};

// CSV読み込み機能
function importCSV() {
    const fileInput = document.getElementById("csvFileInput").files[0];
    if (!fileInput) {
        alert("CSVファイルを選択してください。");
        return;
    }

    // 使用するクライアントを選択（例としてclientAを使用）
    const currentClient = clientSettings.clientA;

    const encoding = document.querySelector('input[name="encoding"]:checked').value;
    const reader = new FileReader();

    reader.onload = function (event) {
        const uint8Array = new Uint8Array(event.target.result);
        const text = new TextDecoder(encoding).decode(uint8Array);
        parseCSV(text, currentClient); // currentClientを引数として渡す
    };

    reader.readAsArrayBuffer(fileInput); // ArrayBufferとして読み込む
}

function parseCSV(text, clientConfig) {
    const includeHeader = document.getElementById("includeHeader").checked;
    const rows = text.split("\n");

    // ヘッダーをスキップする場合は最初の行を削除
    const startIndex = includeHeader ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.trim()) {  // 空行のスキップ
            const columns = row.split(",");
            addRowToFirestore(columns, clientConfig);
        }
    }

    document.getElementById("statusMessage").innerText = "データがFirebaseに追加されました";
}

// Firestoreにデータ追加
function addRowToFirestore(columns, clientConfig) {
    const pickingData = {
        picking_id: columns[clientConfig.picking_id],
        user_id: getCurrentUserId(),
        item_id: db.collection("Items").doc(columns[clientConfig.item_id]), // Itemsのドキュメントを参照
        status: false, // 初期状態は未完了
        inspection_date: columns[clientConfig.inspection_date] || null,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("Pickings").add(pickingData)
        .then(() => console.log("Pickings データが追加されました"))
        .catch(error => console.error("Error adding Pickings data:", error));
}

// ログインユーザーのIDを取得する関数（仮）
function getCurrentUserId() {
    // 実際のログインユーザー情報を取得する処理をここで実装する必要があります
    return "current_user_id"; // 例として仮のIDを返しています
}
