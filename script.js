document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM要素の取得 ----
    const rosterView = document.getElementById('roster-view');
    const rosterContainer = document.getElementById('character-roster');
    const instructionText = document.getElementById('instruction-text');
    const backBtn = document.getElementById('back-btn');

    const matchView = document.getElementById('match-view');
    const backToRosterBtn = document.getElementById('back-to-roster-btn');
    const vsText = document.getElementById('vs-text');
    const winBtn = document.getElementById('win-btn');
    const lossBtn = document.getElementById('loss-btn');
    const rate10El = document.getElementById('rate-10');
    const rate50El = document.getElementById('rate-50');
    const historyCountEl = document.getElementById('history-count');
    const historyListEl = document.getElementById('history-list');
    const clearAllHistoryBtn = document.getElementById('clear-all-history-btn');

    // ランキング画面用
    const rankingView = document.getElementById('ranking-view');
    const backFromRankingBtn = document.getElementById('back-from-ranking-btn');
    const tab10Btn = document.getElementById('tab-10-btn');
    const tab50Btn = document.getElementById('tab-50-btn');
    const rankingListEl = document.getElementById('ranking-list');
    // 詳細勝率画面用
    const detailView = document.getElementById('detail-view');
    const backFromDetailBtn = document.getElementById('back-from-detail-btn');
    const detailCharName = document.getElementById('detail-char-name');
    const detailRate10 = document.getElementById('detail-rate-10');
    const detailRate50 = document.getElementById('detail-rate-50');
    const detailRankingListEl = document.getElementById('detail-ranking-list');

    // ローディング画面用
    const loadingOverlay = document.getElementById('loading-overlay');

    // ---- キャラクター名リスト（全87個） ----
    const characterList = [
        "マリオ", "ドンキーコング", "リンク", "サムス", "ダークサムス", "ヨッシー", "カービィ", "フォックス",
        "ピカチュウ", "ルイージ", "ネス", "キャプテン・ファルコン", "プリン", "ピーチ", "デイジー", "クッパ",
        "アイスクライマー", "シーク", "ゼルダ", "ドクターマリオ", "ピチュー", "ファルコ", "マルス", "ルキナ",
        "こどもリンク", "ガノンドロフ", "ミュウツー", "ロイ", "クロム", "Mr.ゲーム&ウォッチ", "メタナイト", "ピット",
        "ブラックピット", "ゼロスーツサムス", "ワリオ", "スネーク", "アイク", "ポケモントレーナー", "ディディーコング",
        "リュカ", "ソニック", "デデデ", "ピクミン&オリマー", "ルカリオ", "ロボット", "トゥーンリンク", "ウルフ",
        "むらびと", "ロックマン", "Wii Fit トレーナー", "ロゼッタ&チコ", "リトル・マック", "ゲッコウガ", "パルテナ",
        "パックマン", "ルフレ", "シュルク", "クッパJr.", "ダックハント", "リュウ", "ケン", "クラウド", "カムイ",
        "ベヨネッタ", "インクリング", "リドリー", "シモン", "リヒター", "キングクルール", "しずえ", "ガオガエン",
        "パックンフラワー", "ジョーカー", "勇者", "バンジョー&カズーイ", "テリー", "ベレト/ベレス", "ミェンミェン",
        "スティーブ", "セフィロス", "ホムラヒカリ", "カズヤ", "ソラ", "Mii 格闘タイプ", "Mii 剣術タイプ", "Mii 射撃タイプ", "詳細勝率 / 全キャラ勝率"
    ];

    const totalCharacters = characterList.length;

    // ---- 状態管理 ----
    let selectedPlayerId = null;
    let selectedOpponentId = null;
    let selectedPlayerBtn = null;
    let selectedOpponentBtn = null;
    let currentPhase = 'player'; // 'player' or 'opponent' or 'match' or 'ranking' or 'detail'
    let currentMatchKey = '';
    let currentRankingType = 10; // 10 or 50

    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzCuMj4AuzxZPs2fy8OW3Vs9A3m_OhKGcKyyoolv3ky12xITEHBg0VG-KoI83iVYh1z2w/exec';
    let globalMatchData = {}; // 取得したデータを一時保存する変数

    // ---- GASとの通信処理 ----
    // 全データ取得
    async function loadHistoryData() {
        try {
            const response = await fetch(GAS_URL);
            const data = await response.json();
            globalMatchData = data;
            return data;
        } catch (e) {
            console.error("データの読み込みに失敗しました", e);
            return globalMatchData; // 失敗時はキャッシュを返す
        }
    }

    // データ送信（追加・削除など）
    async function sendToGAS(payload) {
        try {
            await fetch(GAS_URL, {
                method: "POST",
                mode: 'no-cors', // CROSエラーを避けるためにno-corsを指定
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });

            // 処理後に最新データを再取得して画面更新
            // ※ no-corsだとレスポンスは読めない（opaqueになる）ため、そのままリロードする
            await loadHistoryData();
            if (currentPhase === 'match') {
                renderMatchStats();
            } else if (currentPhase === 'ranking') {
                renderRanking();
            }
        } catch (e) {
            console.error("データの送信に失敗しました", e);
            alert("通信エラーが発生しました。（GASのURLやデプロイ設定をご確認ください）");
        }
    }

    function addMatchResult(result) {
        const timestamp = Date.now();

        // 画面上には先行して反映させる（レスポンス待ちのラグ軽減）
        if (!globalMatchData[currentMatchKey]) {
            globalMatchData[currentMatchKey] = [];
        }
        globalMatchData[currentMatchKey].unshift({ d: timestamp, r: result });
        renderMatchStats();

        // GASへ送信
        sendToGAS({
            action: "addMatch",
            matchKey: currentMatchKey,
            date: timestamp,
            result: result
        });
    }

    function deleteMatchRecord(index) {
        if (confirm("この対戦記録を消去しますか？")) {
            const history = globalMatchData[currentMatchKey];
            if (history && history.length > index) {
                const target = history[index];

                // 画面上から先に消去
                globalMatchData[currentMatchKey].splice(index, 1);
                renderMatchStats();

                // GASへ削除リクエスト
                sendToGAS({
                    action: "deleteMatch",
                    matchKey: currentMatchKey,
                    date: target.d,
                    result: target.r
                });
            }
        }
    }

    // ----UI描画・更新処理 ----
    function formatDisplayDate(dateData) {
        // 旧フォーマット ("260309" のような文字列) の場合
        if (typeof dateData === 'string' && dateData.length === 6) {
            return `20${dateData.slice(0, 2)}/${dateData.slice(2, 4)}/${dateData.slice(4, 6)}`;
        }
        // 新フォーマット (UNIXタイムスタンプ) の場合
        if (typeof dateData === 'number') {
            const d = new Date(dateData);
            const yy = String(d.getFullYear());
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}/${mm}/${dd}`;
        }
        return dateData;
    }

    function renderMatchStats() {
        // GAS通信導入後は非同期でデータを取得済みのため globalMatchData を使用
        const data = globalMatchData;
        const history = data[currentMatchKey] || [];

        // 戦績計算 (r: 1=勝ち, 0=負け)
        const calcWinRate = (games) => {
            if (games.length === 0) return "--%";
            const wins = games.filter(g => g.r === 1).length;
            return Math.round((wins / games.length) * 100) + "%";
        };

        const recent10 = history.slice(0, 10);
        const recent50 = history.slice(0, 50);

        rate10El.textContent = calcWinRate(recent10);
        rate50El.textContent = calcWinRate(recent50);

        historyCountEl.textContent = `(${history.length})`;

        // 履歴リストの描画
        historyListEl.innerHTML = '';
        history.slice(0, 50).forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item';

            const dateSpan = document.createElement('span');
            dateSpan.className = 'history-date';
            dateSpan.textContent = formatDisplayDate(item.d);

            const rightDiv = document.createElement('div');
            rightDiv.className = 'history-right';

            const resultSpan = document.createElement('span');
            if (item.r === 1) {
                resultSpan.className = 'history-result win';
                resultSpan.textContent = 'WIN';
            } else {
                resultSpan.className = 'history-result loss';
                resultSpan.textContent = 'LOSE';
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-history-btn';
            deleteBtn.textContent = '消去';
            deleteBtn.addEventListener('click', () => {
                deleteMatchRecord(index);
            });

            rightDiv.appendChild(resultSpan);
            rightDiv.appendChild(deleteBtn);

            li.appendChild(dateSpan);
            li.appendChild(rightDiv);
            historyListEl.appendChild(li);
        });
    }

    function openMatchView(pId, oId) {
        currentPhase = 'match';
        currentMatchKey = `${pId}_${oId}`;

        // 画面切り替え
        rosterView.classList.add('hidden');
        matchView.classList.remove('hidden');

        // VSテキスト設定
        const pName = characterList[pId];
        const oName = characterList[oId];
        vsText.textContent = `${pName} VS ${oName}`;

        renderMatchStats();
    }

    function closeMatchView() {
        currentPhase = 'player';
        matchView.classList.add('hidden');
        rosterView.classList.remove('hidden');

        // 選択状態のリセット
        if (selectedPlayerBtn) selectedPlayerBtn.classList.remove('selected');
        if (selectedOpponentBtn) selectedOpponentBtn.classList.remove('selected');
        selectedPlayerBtn = null;
        selectedOpponentBtn = null;
        selectedPlayerId = null;
        selectedOpponentId = null;

        instructionText.textContent = '使用キャラクターを選択してください';
        backBtn.classList.add('hidden');
    }

    // ---- ランキング処理 ----
    function renderRanking() {
        rankingListEl.innerHTML = '';
        const data = globalMatchData;
        const rankingData = [];

        // キャラクターごとの総合勝率を計算
        for (let i = 0; i < totalCharacters - 1; i++) { // 最後のボタンは除く
            let totalGames = [];

            // i番目のキャラがプレイヤーだった場合の全マッチアップの履歴を収集
            for (const key in data) {
                const [pId, oId] = key.split('_').map(Number);
                if (pId === i) {
                    // 各マッチアップの履歴はすでに配列の先頭が最新になっている
                    // そのため、そのまま結合していく
                    totalGames = totalGames.concat(data[key]);
                }
            }

            if (totalGames.length > 0) {
                // UNIXタイムスタンプ、または旧形式に合わせて時間単位で正確に降順ソート
                totalGames.sort((a, b) => {
                    const timeA = typeof a.d === 'number' ? a.d : new Date(`20${a.d.slice(0, 2)}-${a.d.slice(2, 4)}-${a.d.slice(4, 6)}`).getTime();
                    const timeB = typeof b.d === 'number' ? b.d : new Date(`20${b.d.slice(0, 2)}-${b.d.slice(2, 4)}-${b.d.slice(4, 6)}`).getTime();
                    return timeB - timeA;
                });

                // 10戦まはた50戦でスライス
                const targetGames = totalGames.slice(0, currentRankingType);

                if (targetGames.length > 0) {
                    const wins = targetGames.filter(g => g.r === 1).length;
                    const winRate = wins / targetGames.length;

                    rankingData.push({
                        id: i,
                        name: characterList[i],
                        rate: winRate,
                        wins: wins,
                        total: targetGames.length
                    });
                }
            }
        }

        // 勝率で降順ソート、同率なら試合数が多い順
        rankingData.sort((a, b) => {
            if (b.rate !== a.rate) {
                return b.rate - a.rate;
            }
            return b.total - a.total;
        });

        // 描画
        if (rankingData.length === 0) {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.textContent = '対戦データがありません。';
            li.style.justifyContent = 'center';
            rankingListEl.appendChild(li);
        } else {
            rankingData.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';

                const rankSpan = document.createElement('span');
                rankSpan.className = 'ranking-rank';
                rankSpan.textContent = `${index + 1}位`;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'ranking-name';
                nameSpan.textContent = item.name;

                const rateSpan = document.createElement('span');
                rateSpan.className = 'ranking-rate';
                rateSpan.textContent = `${Math.round(item.rate * 100)}%`;

                const detailSpan = document.createElement('span');
                detailSpan.style.fontSize = '12px';
                detailSpan.style.color = '#718096';
                detailSpan.style.marginLeft = '8px';
                detailSpan.textContent = `(${item.wins}勝/${item.total}戦)`;

                const rightDiv = document.createElement('div');
                rightDiv.style.display = 'flex';
                rightDiv.style.alignItems = 'baseline';
                rightDiv.appendChild(rateSpan);
                rightDiv.appendChild(detailSpan);

                li.appendChild(rankSpan);
                li.appendChild(nameSpan);
                li.appendChild(rightDiv);

                rankingListEl.appendChild(li);
            });
        }
    }

    function openRankingView() {
        currentPhase = 'ranking';
        rosterView.classList.add('hidden');
        rankingView.classList.remove('hidden');
        renderRanking();
    }

    function closeRankingView() {
        currentPhase = 'player';
        rankingView.classList.add('hidden');
        rosterView.classList.remove('hidden');
        instructionText.textContent = '使用キャラクターを選択してください';
    }

    // ---- 詳細勝率画面の処理 ----
    function renderDetailStats(targetCharId) {
        detailRankingListEl.innerHTML = '';
        const data = globalMatchData;
        const opponentRankingData = [];
        const charName = characterList[targetCharId];
        detailCharName.textContent = `${charName}の詳細勝率`;

        // 過去の該当キャラの全試合を1つの配列に収集しつつ、相手ごとのデータも集計
        let allGames = [];

        for (let i = 0; i < totalCharacters - 1; i++) {
            if (i === targetCharId) continue; // 同キャラ戦も集計する場合はコメントアウト

            // targetCharId がプレイヤー側だった場合
            const key1 = `${targetCharId}_${i}`;
            let oppGames = [];
            if (data[key1]) {
                oppGames = oppGames.concat(data[key1]);
            }
            // ※もし targetCharId が相手側だった場合も集計するなら、ここのロジックを変更する
            // 現在は仕様として「自身がプレイヤー側の勝率のみ」をベースに集計していると仮定

            if (oppGames.length > 0) {
                // 相手ごとの戦績（最新順ソート）
                oppGames.sort((a, b) => {
                    const timeA = typeof a.d === 'number' ? a.d : new Date(`20${a.d.slice(0, 2)}-${a.d.slice(2, 4)}-${a.d.slice(4, 6)}`).getTime();
                    const timeB = typeof b.d === 'number' ? b.d : new Date(`20${b.d.slice(0, 2)}-${b.d.slice(2, 4)}-${b.d.slice(4, 6)}`).getTime();
                    return timeB - timeA;
                });

                // 相手ごとには直近50戦までで勝率計算（ランキング用）
                const recentOppGames = oppGames.slice(0, 50);
                const wins = recentOppGames.filter(g => g.r === 1).length;

                opponentRankingData.push({
                    opponentId: i,
                    opponentName: characterList[i],
                    rate: wins / recentOppGames.length,
                    wins: wins,
                    total: recentOppGames.length
                });

                allGames = allGames.concat(oppGames);
            }
        }

        // --- 総合勝率処理 ---
        // 全試合を最新順にソート
        allGames.sort((a, b) => {
            const timeA = typeof a.d === 'number' ? a.d : new Date(`20${a.d.slice(0, 2)}-${a.d.slice(2, 4)}-${a.d.slice(4, 6)}`).getTime();
            const timeB = typeof b.d === 'number' ? b.d : new Date(`20${b.d.slice(0, 2)}-${b.d.slice(2, 4)}-${b.d.slice(4, 6)}`).getTime();
            return timeB - timeA;
        });

        // 10戦総合勝率
        const recent10 = allGames.slice(0, 10);
        if (recent10.length > 0) {
            const wins10 = recent10.filter(g => g.r === 1).length;
            detailRate10.textContent = `${Math.round((wins10 / recent10.length) * 100)}%`;
        } else {
            detailRate10.textContent = '--%';
        }

        // 50戦総合勝率
        const recent50 = allGames.slice(0, 50);
        if (recent50.length > 0) {
            const wins50 = recent50.filter(g => g.r === 1).length;
            detailRate50.textContent = `${Math.round((wins50 / recent50.length) * 100)}%`;
        } else {
            detailRate50.textContent = '--%';
        }

        // --- 相手ランキング処理 ---
        // 勝率で降順ソート
        opponentRankingData.sort((a, b) => {
            if (b.rate !== a.rate) {
                return b.rate - a.rate;
            }
            return b.total - a.total; // 同率なら試合数が多い相手が上
        });

        if (opponentRankingData.length === 0) {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.textContent = '対戦データがありません。';
            li.style.justifyContent = 'center';
            detailRankingListEl.appendChild(li);
        } else {
            opponentRankingData.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';

                const rankSpan = document.createElement('span');
                rankSpan.className = 'ranking-rank';
                rankSpan.textContent = `${index + 1}位`;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'ranking-name';
                nameSpan.textContent = `vs ${item.opponentName}`;

                const rateSpan = document.createElement('span');
                rateSpan.className = 'ranking-rate';
                rateSpan.textContent = `${Math.round(item.rate * 100)}%`;

                const detailSpan = document.createElement('span');
                detailSpan.style.fontSize = '12px';
                detailSpan.style.color = '#718096';
                detailSpan.style.marginLeft = '8px';
                detailSpan.textContent = `(${item.wins}勝/${item.total}戦)`;

                const rightDiv = document.createElement('div');
                rightDiv.style.display = 'flex';
                rightDiv.style.alignItems = 'baseline';
                rightDiv.appendChild(rateSpan);
                rightDiv.appendChild(detailSpan);

                li.appendChild(rankSpan);
                li.appendChild(nameSpan);
                li.appendChild(rightDiv);

                detailRankingListEl.appendChild(li);
            });
        }
    }

    function openDetailView() {
        currentPhase = 'detail';
        rosterView.classList.add('hidden');
        detailView.classList.remove('hidden');
        renderDetailStats(selectedPlayerId);
    }

    function closeDetailView() {
        currentPhase = 'opponent'; // 詳細画面からは対戦相手選択画面に戻る
        detailView.classList.add('hidden');
        rosterView.classList.remove('hidden');
    }

    // ---- イベントリスナー設定 ----

    // オサレ・勝敗入力画面の戻るボタン
    backToRosterBtn.addEventListener('click', closeMatchView);

    // キャラ選択画面の戻るボタン（対戦相手選択中から使用キャラ選択へ）
    backBtn.addEventListener('click', () => {
        if (currentPhase === 'opponent') {
            if (selectedOpponentBtn) {
                selectedOpponentBtn.classList.remove('selected');
                selectedOpponentBtn = null;
                selectedOpponentId = null;
            }
            if (selectedPlayerBtn) {
                selectedPlayerBtn.classList.add('selected');
            }
            // 右下ボタンのテキストを「全キャラ勝率」に戻す
            const actionBtn = rosterContainer.lastElementChild;
            if (actionBtn && actionBtn.classList.contains('settings-btn')) {
                actionBtn.textContent = '全キャラ勝率';
            }
            instructionText.textContent = '使用キャラクターを選択してください';
            currentPhase = 'player';
            backBtn.classList.add('hidden');
        }
    });

    // ランキング画面の戻るボタン
    backFromRankingBtn.addEventListener('click', closeRankingView);

    // 詳細勝率画面の戻るボタン
    backFromDetailBtn.addEventListener('click', closeDetailView);

    // ランキングのタブ切り替え
    tab10Btn.addEventListener('click', () => {
        if (currentRankingType !== 10) {
            currentRankingType = 10;
            tab10Btn.className = 'result-btn win-btn active-tab';
            tab50Btn.className = 'result-btn loss-btn inactive-tab';
            renderRanking();
        }
    });

    tab50Btn.addEventListener('click', () => {
        if (currentRankingType !== 50) {
            currentRankingType = 50;
            tab50Btn.className = 'result-btn win-btn active-tab';
            tab10Btn.className = 'result-btn loss-btn inactive-tab';
            renderRanking();
        }
    });

    // 履歴全削除ボタンイベント
    clearAllHistoryBtn.addEventListener('click', () => {
        const history = globalMatchData[currentMatchKey] || [];

        if (history.length === 0) {
            alert("削除する履歴がありません。");
            return;
        }

        if (confirm(`このマッチアップの対戦履歴（全${history.length}件）を本当にすべて消去しますか？\nこの操作は元に戻せません。`)) {
            // 画面上から消去
            globalMatchData[currentMatchKey] = [];
            renderMatchStats();

            // GASへ全削除リクエスト
            sendToGAS({
                action: "clearAll",
                matchKey: currentMatchKey
            });
        }
    });

    // 勝敗ボタンイベント
    winBtn.addEventListener('click', () => addMatchResult(1)); // 1: 勝ち
    lossBtn.addEventListener('click', () => addMatchResult(0)); // 0: 負け

    // ---- キャラクターボタンの生成 ----
    for (let i = 0; i < totalCharacters; i++) {
        const btn = document.createElement('button');
        let charName = characterList[i];

        btn.className = 'char-btn';
        if (charName === "詳細勝率 / 全キャラ勝率") {
            btn.classList.add('settings-btn'); // 既存の設定ボタンスタイルを流用
            btn.style.borderStyle = 'solid'; // 点線から実線に変更
            btn.style.borderColor = '#cbd5e0';
            btn.style.backgroundColor = '#e2e8f0';
            btn.style.cursor = 'pointer';
            btn.style.color = '#2d3748';
            btn.style.fontWeight = 'bold';

            // 初期状態では「全キャラ勝率」のラベルにする
            btn.textContent = "全キャラ勝率";
        } else {
            btn.textContent = charName;
        }

        btn.dataset.id = i; // インデックスをデータ属性に保持

        // 元の名前が長いので aria-label は元の名前、または現在のテキストをセット
        btn.setAttribute('aria-label', charName);

        btn.addEventListener('click', () => {
            if (charName === "詳細勝率 / 全キャラ勝率") {
                if (currentPhase === 'player') {
                    // プレイヤー選択中に押された場合は全キャラ勝率画面へ
                    loadingOverlay.classList.remove('hidden');
                    loadHistoryData().then(() => {
                        loadingOverlay.classList.add('hidden');
                        openRankingView();
                    });
                } else if (currentPhase === 'opponent') {
                    // 対戦相手選択中に押された場合は「詳細勝率」へ
                    loadingOverlay.classList.remove('hidden');
                    loadHistoryData().then(() => {
                        loadingOverlay.classList.add('hidden');
                        openDetailView();
                    });
                }
                return;
            }

            const charId = parseInt(btn.dataset.id, 10);

            if (currentPhase === 'player') {
                if (selectedPlayerBtn) {
                    selectedPlayerBtn.classList.remove('selected');
                }
                btn.classList.add('selected');
                selectedPlayerBtn = btn;
                selectedPlayerId = charId;

                // 相手選択画面になる前に裏で最新データを取得しておく（表示ラグ軽減）
                loadHistoryData();

                // 右下のボタンのテキストを「詳細勝率」に変更する
                const actionBtn = rosterContainer.lastElementChild;
                if (actionBtn && actionBtn.classList.contains('settings-btn')) {
                    actionBtn.textContent = '詳細勝率';
                }

                setTimeout(() => {
                    btn.classList.remove('selected');
                    instructionText.textContent = '対戦相手のキャラを選択して下さい';
                    currentPhase = 'opponent';
                    backBtn.classList.remove('hidden'); // 戻るボタンを表示
                }, 400);

            } else if (currentPhase === 'opponent') {
                if (selectedOpponentBtn) {
                    selectedOpponentBtn.classList.remove('selected');
                }
                btn.classList.add('selected');
                selectedOpponentBtn = btn;
                selectedOpponentId = charId;

                // 画面遷移
                setTimeout(() => {
                    openMatchView(selectedPlayerId, selectedOpponentId);
                }, 400);
            }
        });

        rosterContainer.appendChild(btn);
    }

    // 初回ロード時にデータを取得しておく
    loadHistoryData();
});
