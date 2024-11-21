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

const clientSettings = {
    clientA: {
        picking_id: 12,
        item_id: 22,
        item_name: 23,
        item_quantity: 24,
        item_barcode: 25,
        recipient_name: 5, // 届け先氏名
        shipment_date: 20, // 発送日
        ins_flg: 26
    },
    clientB: {
        picking_id: 1,
        user_id: 2,
        item_id: 0,
        item_quantity: 3,
        item_barcode: 4,
        recipient_name: 5, // 届け先氏名
        shipment_date: 20, // 発送日
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
                barcode: columns[clientConfig.item_barcode],
                ins_flg: 1,
                item_status: false,
                scanned_count: 0
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
                    recipient_name: columns[clientConfig.recipient_name], // 届け先氏名
                    shipment_date: columns[clientConfig.shipment_date], // 発送日
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

let currentPickingId = null; // 現在のピッキングIDを格納

// ページ読み込み時にイベントリスナーを設定
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("pickingIdInput").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            fetchPickingData();
        }
    });

    document.getElementById("barcodeInput").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            scanBarcode();
        }
    });
});

// ピッキングIDでデータを取得して表示
function fetchPickingData() {
    const pickingIdInput = document.getElementById("pickingIdInput");
    const pickingId = pickingIdInput.value.trim();

    if (!pickingId) {
        alert("ピッキングIDを入力してください。");
        return;
    }

    if (currentPickingId && currentPickingId !== pickingId) {
        resetScannedCount(currentPickingId); // 異なるピッキングIDの場合にscanned_countをリセット
    }

    currentPickingId = pickingId;
    db.collection("Pickings").doc(currentPickingId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data.status === true) {
                    alert("このピッキングIDはすでに検品済みです。");
                    currentPickingId = null;
                    pickingIdInput.focus();
                } else {
                    displayItemList(data.items);
                    document.getElementById("barcodeInput").focus();
// 検品中のピッキングIDを表示
                    document.getElementById("currentPickingIdDisplay").textContent = `現在検品中のピッキングID: ${currentPickingId}`;

                }
            } else {
                alert("該当するピッキングIDが見つかりませんでした。");
                currentPickingId = null;
                pickingIdInput.focus();
            }
        })
        .catch((error) => {
            console.error("エラーが発生しました:", error);
            currentPickingId = null;
            pickingIdInput.focus();
        })
        .finally(() => {
            pickingIdInput.value = "";
        });
}

// 異なるピッキングIDが入力された場合にscanned_countをリセット
function resetScannedCount(pickingId) {
    db.collection("Pickings").doc(pickingId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const resetItems = data.items.map((item) => {
                    item.scanned_count = 0;
                    item.item_status = false;
                    return item;
                });

                // Firestoreにリセット状態を更新
                db.collection("Pickings").doc(pickingId).update({
                    items: resetItems,
                    status: false
                });
            }
        })
        .catch((error) => {
            console.error("scanned_countのリセットに失敗しました:", error);
        });
}

// アイテムリストの表示
function displayItemList(items) {
    const itemListContainer = document.getElementById("itemListContainer");
    const itemList = document.getElementById("itemList");
    itemList.innerHTML = ""; // 既存のリストをクリア

    items.forEach((item) => {
        if (item.scanned_count === undefined) {
            item.scanned_count = 0;
        }

        const listItem = document.createElement("li");
        listItem.id = `item-${item.item_id}`; // IDを設定
        listItem.className = item.item_status ? "complete" : "";

        // 各項目を列に分けて表示
        listItem.innerHTML = `
            <div>${item.item_name}</div>
            <div>${item.barcode}</div>
            <div>${item.item_status ? '完了' : '未検品'}</div>
            <div>${item.scanned_count}/${item.quantity}</div>
        `;

        itemList.appendChild(listItem);
    });

    itemListContainer.style.display = "block";
}

// アイテムの表示更新関数（初期表示とスキャン後の表示を統一）
function updateItemDisplay(item) {
    const listItem = document.getElementById(`item-${item.item_id}`);
    if (listItem) {
        listItem.innerHTML = `
            <div>${item.item_name}</div>
            <div>${item.barcode}</div>
            <div>${item.item_status ? '完了' : '検品中'}</div>
            <div>${item.scanned_count}/${item.quantity}</div>
        `;

        // 完了状態に応じてクラスを動的に設定
        if (item.item_status) {
            listItem.classList.add("complete");
        } else {
            listItem.classList.remove("complete");
        }
    } else {
        console.error(`IDが ${item.item_id} の要素が見つかりませんでした`);
    }
}

// バーコードスキャン機能
function scanBarcode() {
    const barcodeInput = document.getElementById("barcodeInput");
    const barcode = barcodeInput.value.trim();

    if (!barcode || !currentPickingId) {
        alert("バーコードとピッキングIDを入力してください。");
        return;
    }

    db.collection("Pickings").doc(currentPickingId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                let allInspected = true;
                let itemUpdated = false; // スキャンで更新されたアイテムがあるかどうか

                const updatedItems = data.items.map((item) => {
                    // 同じバーコードを持つアイテムがある場合、まだ完了していない最初のアイテムにのみ適用
                    if (item.barcode === barcode && !itemUpdated && item.scanned_count < item.quantity) {
                        // 検品数を増加させる
                        item.scanned_count = (item.scanned_count || 0) + 1;
                        if (item.scanned_count >= item.quantity) {
                            item.item_status = true; // 状態を完了に更新
                        }
                        itemUpdated = true; // 1つのアイテムのみ処理するためフラグを設定
                    }

                    // 全体の検品完了状態をチェック
                    if (!item.item_status) {
                        allInspected = false;
                    }

                    return item;
                });

                // 対象アイテムがすべて検品完了の場合のみエラーメッセージ
                if (!itemUpdated) {
                    alert("このバーコードのすべてのアイテムは既に設定された数量に達しています。");
                }

                // Firestoreにデータを更新
                db.collection("Pickings").doc(currentPickingId).update({
                    items: updatedItems,
                    status: allInspected
                }).then(() => {
                    document.getElementById("statusMessage").innerText = allInspected ? "全てのアイテムが検品完了しました。" : "アイテムの検品が進行中です。";
                    
                    // 全アイテムが完了している場合
                    if (allInspected) {
                        document.getElementById("pickingIdInput").focus();
                        document.getElementById("currentPickingIdDisplay").textContent = `検品完了したピッキングID: ${currentPickingId}`;

                    } else {
                        barcodeInput.focus();
                    }

                    // すべてのアイテムを再描画
                    displayItemList(updatedItems);
                });
            }
        })
        .catch((error) => {
            console.error("エラーが発生しました:", error);
        })
        .finally(() => {
            barcodeInput.value = "";
        });
}
