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
        picking_id: 12,
        item_id: 22,
        item_name: 23,
        item_quantity: 24,
        item_barcode: 25,
    },
    clientB: {
        picking_id: 1,
        user_id: 2,
        item_id: 0,
        item_quantity: 3,
        item_barcode: 4,
        created_at: 3
    }
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

    // ピッキングIDごとにデータをまとめるためのオブジェクト
    const pickingsData = {};

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.trim()) {  // 空行のスキップ
            const columns = row.split(",");
            const pickingId = columns[clientConfig.picking_id];
            
            // アイテム情報をまとめたオブジェクト
            const itemData = {
                item_id: columns[clientConfig.item_id],
                item_name: columns[clientConfig.item_name],
                quantity: parseInt(columns[clientConfig.item_quantity], 10),
                barcode: columns[clientConfig.item_barcode]
            };

            // すでにピッキングIDが存在するかチェック
            if (pickingsData[pickingId]) {
                // 存在する場合はアイテムを追加
                pickingsData[pickingId].items.push(itemData);
            } else {
                // 新しいピッキングデータを作成
                pickingsData[pickingId] = {
                    picking_id: pickingId,
                    user_id: getCurrentUserId(),
                    items: [itemData],
                    status: false,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                };
            }
        }
    }

    // Firestoreにデータを追加
    for (const pickingId in pickingsData) {
        db.collection("Pickings").doc(pickingId).set(pickingsData[pickingId])
            .then(() => console.log(`ピッキングID ${pickingId} のデータが追加されました`))
            .catch(error => console.error(`Error adding data for picking_id ${pickingId}:`, error));
    }

    document.getElementById("statusMessage").innerText = "データがFirebaseに追加されました";
}

// ログインユーザーのIDを取得する関数（仮）
function getCurrentUserId() {
    // 実際のログインユーザー情報を取得する処理をここで実装する必要があります
    return "current_user_id"; // 例として仮のIDを返しています
}
