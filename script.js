document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM要素の取得 ----
    const rosterView = document.getElementById('roster-view');
    const rosterContainer = document.getElementById('character-roster');
    const instructionText = document.getElementById('instruction-text');
    const backBtn = document.getElementById('back-btn');
    const selectedPlayerDisplay = document.getElementById('selected-player-display');
    const playerNameText = document.getElementById('player-name-text');

    // 勝敗記録画面 (旧：勝率計算・記録ページ / マッチ画面)
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

    // 内訳インライン用のDOM取得
    const breakdown10Btn = document.getElementById('breakdown-10-btn');
    const breakdown50Btn = document.getElementById('breakdown-50-btn');
    const breakdownInlineContainer = document.getElementById('breakdown-inline-container');
    const breakdownTitle = document.getElementById('breakdown-title');
    const breakdownList = document.getElementById('breakdown-list');

    // 現在表示中の「内訳」の状態管理
    let activeBreakdownType = null; // '10' or '50' or null

    // ローディング画面用
    const loadingOverlay = document.getElementById('loading-overlay');

    // ---- ユーティリティ ----
    function autoShrinkText(element, defaultSize = 15, minSize = 9) {
        requestAnimationFrame(() => {
            let fontSize = defaultSize;
            element.style.fontSize = fontSize + 'px';
            while (element.scrollWidth > element.offsetWidth && fontSize > minSize) {
                fontSize -= 0.5;
                element.style.fontSize = fontSize + 'px';
            }
        });
    }

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
        "パックンフラワー", "ジョーカー", "勇者", "バンジョー&カズーイ", "テリー", "ベレト・ベレス", "ミェンミェン",
        "スティーブ", "セフィロス", "ホムラ・ヒカリ", "カズヤ", "ソラ", "Mii 格闘タイプ", "Mii 剣術タイプ", "Mii 射撃タイプ", "詳細勝率 / 全キャラ勝率"
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

    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwXjfE25KuGvsV3YZC2MJiPD2v46x-Nqmh-v9ohEtq0U2rbkFX5JYtGpvLohaQNkWetQg/exec';
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

    function deleteMatchRecord(targetDate) {
        if (confirm("この対戦記録を消去しますか？")) {
            const history = globalMatchData[currentMatchKey];
            // 日付で一意に特定して削除対象を探す
            const index = history ? history.findIndex(g => g.d === targetDate) : -1;
            if (index !== -1) {
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

        // タイムスタンプで降順ソート（新しい順）してからスライス
        const sorted = [...history].sort((a, b) => {
            const tA = typeof a.d === 'number' ? a.d : new Date(`20${a.d.slice(0, 2)}-${a.d.slice(2, 4)}-${a.d.slice(4, 6)}`).getTime();
            const tB = typeof b.d === 'number' ? b.d : new Date(`20${b.d.slice(0, 2)}-${b.d.slice(2, 4)}-${b.d.slice(4, 6)}`).getTime();
            return tB - tA;
        });

        const recent10 = sorted.slice(0, 10);
        const recent50 = sorted.slice(0, 50);

        rate10El.textContent = calcWinRate(recent10);
        rate50El.textContent = calcWinRate(recent50);

        historyCountEl.textContent = `(${history.length})`;

        // 履歴リストの描画（新しい順に表示）
        historyListEl.innerHTML = '';
        sorted.slice(0, 50).forEach((item, index) => {
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
                deleteMatchRecord(item.d); // 日付で一意に特定して削除
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
        matchView.classList.remove('hidden'); // 勝敗記録画面を表示

        // VSテキスト設定
        const pName = characterList[pId];
        const oName = characterList[oId];
        vsText.innerHTML = `
            <div class="vs-header-content">
                <img src="images/${pName}.jpg" class="header-img" alt="${pName}" onerror="this.style.display='none'">
                <span>${pName} VS ${oName}</span>
                <img src="images/${oName}.jpg" class="header-img" alt="${oName}" onerror="this.style.display='none'">
            </div>
        `;

        renderMatchStats();
    }

    function closeMatchView() {
        currentPhase = 'opponent';
        matchView.classList.add('hidden');
        rosterView.classList.remove('hidden');

        // 相手キャラの選択状態のみリセット
        if (selectedOpponentBtn) selectedOpponentBtn.classList.remove('selected');
        selectedOpponentBtn = null;
        selectedOpponentId = null;

        instructionText.textContent = '対戦相手のキャラを選択して下さい';

        // 使用キャラは選択されたままなので、表示を維持
        backBtn.classList.remove('hidden');
        selectedPlayerDisplay.classList.remove('hidden');
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

                // --- 画像要素の追加 ---
                const imgWrap = document.createElement('div');
                imgWrap.className = 'ranking-img-wrapper';

                const img = document.createElement('img');
                img.src = `images/${item.name}.jpg`;
                img.alt = item.name;
                img.className = 'ranking-img';

                // 画像読み込み成功時のみ要素を追加
                img.addEventListener('load', () => {
                    imgWrap.appendChild(img);
                });

                const nameSpan = document.createElement('span');
                nameSpan.className = 'ranking-name';
                nameSpan.textContent = item.name;

                // 左側の要素をまとめるラッパー（ランク、画像、名前）
                const leftDiv = document.createElement('div');
                leftDiv.className = 'ranking-left-group';
                leftDiv.appendChild(rankSpan);
                leftDiv.appendChild(imgWrap);
                leftDiv.appendChild(nameSpan);

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

                li.appendChild(leftDiv);
                li.appendChild(rightDiv);

                rankingListEl.appendChild(li);
                autoShrinkText(nameSpan);
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
        detailCharName.innerHTML = `
            <div class="vs-header-content">
                <img src="images/${charName}.jpg" class="header-img" alt="${charName}" onerror="this.style.display='none'">
                <span>${charName}の詳細勝率</span>
            </div>
        `;

        // 過去の該当キャラの全試合を1つの配列に収集しつつ、相手ごとのデータも集計
        let allGames = [];

        for (let i = 0; i < totalCharacters - 1; i++) {
            // 同キャラ戦も含めて集計するためスキップしない

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

                // allGames に追加する際、対戦相手のIDも付与しておく（内訳表示用）
                const oppGamesWithId = oppGames.map(game => ({
                    ...game,
                    opponentId: i
                }));
                allGames = allGames.concat(oppGamesWithId);
            }
        }

        // --- 総合勝率処理 ---
        // 全試合を最新順にソート
        allGames.sort((a, b) => {
            const timeA = typeof a.d === 'number' ? a.d : new Date(`20${a.d.slice(0, 2)} -${a.d.slice(2, 4)} -${a.d.slice(4, 6)} `).getTime();
            const timeB = typeof b.d === 'number' ? b.d : new Date(`20${b.d.slice(0, 2)} -${b.d.slice(2, 4)} -${b.d.slice(4, 6)} `).getTime();
            return timeB - timeA;
        });

        // 10戦総合勝率
        const recent10 = allGames.slice(0, 10);
        if (recent10.length > 0) {
            const wins10 = recent10.filter(g => g.r === 1).length;
            detailRate10.textContent = `${Math.round((wins10 / recent10.length) * 100)}% `;
            breakdown10Btn.classList.remove('hidden');
        } else {
            detailRate10.textContent = '--%';
            breakdown10Btn.classList.add('hidden');
        }

        // 10戦内訳ボタンイベント
        breakdown10Btn.onclick = () => toggleBreakdown('10', recent10, "直近10戦 内訳");

        // 50戦総合勝率
        const recent50 = allGames.slice(0, 50);
        if (recent50.length > 0) {
            const wins50 = recent50.filter(g => g.r === 1).length;
            detailRate50.textContent = `${Math.round((wins50 / recent50.length) * 100)}% `;
            breakdown50Btn.classList.remove('hidden');
        } else {
            detailRate50.textContent = '--%';
            breakdown50Btn.classList.add('hidden');
        }

        // 50戦内訳ボタンイベント
        breakdown50Btn.onclick = () => toggleBreakdown('50', recent50, "直近50戦 内訳");

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

                // --- 画像要素の追加 ---
                const imgWrap = document.createElement('div');
                imgWrap.className = 'ranking-img-wrapper';

                const img = document.createElement('img');
                img.src = `images/${item.opponentName}.jpg`;
                img.alt = item.opponentName;
                img.className = 'ranking-img';

                img.addEventListener('load', () => {
                    imgWrap.appendChild(img);
                });

                const nameSpan = document.createElement('span');
                nameSpan.className = 'ranking-name';
                nameSpan.textContent = `${item.opponentName}`;

                const leftDiv = document.createElement('div');
                leftDiv.className = 'ranking-left-group';
                leftDiv.appendChild(rankSpan);
                leftDiv.appendChild(imgWrap);
                leftDiv.appendChild(nameSpan);

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

                li.appendChild(leftDiv);
                li.appendChild(rightDiv);

                detailRankingListEl.appendChild(li);
                autoShrinkText(nameSpan);
            });
        }
    }

    function openDetailView() {
        currentPhase = 'detail';
        rosterView.classList.add('hidden');
        detailView.classList.remove('hidden');
        // 詳細画面を開くときは内訳表示をリセット
        activeBreakdownType = null;
        breakdownInlineContainer.classList.add('hidden');
        renderDetailStats(selectedPlayerId);
    }

    function closeDetailView() {
        currentPhase = 'opponent'; // 詳細画面からは対戦相手選択画面に戻る
        detailView.classList.add('hidden');
        rosterView.classList.remove('hidden');
    }

    // ---- 内訳インライン処理 ----
    function toggleBreakdown(type, games, title) {
        // 同じボタンが押された場合は閉じる（トグル）
        if (activeBreakdownType === type) {
            breakdownInlineContainer.classList.add('hidden');
            activeBreakdownType = null;
            return;
        }

        // 違うボタンが押された（または初回）の場合は表示内容を更新して開く
        activeBreakdownType = type;
        breakdownTitle.textContent = title;
        breakdownList.innerHTML = '';

        if (games.length === 0) {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.textContent = 'データがありません。';
            li.style.justifyContent = 'center';
            breakdownList.appendChild(li);
        } else {
            games.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'history-item';

                // 日付
                const dateSpan = document.createElement('span');
                dateSpan.className = 'history-date';
                dateSpan.textContent = formatDisplayDate(item.d);

                // 対戦相手
                const oppName = characterList[item.opponentId];

                // 画像要素の追加
                const imgWrap = document.createElement('div');
                imgWrap.className = 'ranking-img-wrapper breakdown-list-img';

                const img = document.createElement('img');
                img.src = `images/${oppName}.jpg`;
                img.alt = oppName;
                img.className = 'ranking-img';

                img.addEventListener('load', () => {
                    imgWrap.appendChild(img);
                });

                const oppSpan = document.createElement('span');
                oppSpan.className = 'ranking-name breakdown-list-name';
                oppSpan.style.flexGrow = '1';
                oppSpan.textContent = `vs ${oppName}`;

                const leftDiv = document.createElement('div');
                leftDiv.className = 'ranking-left-group';
                leftDiv.appendChild(dateSpan);
                leftDiv.appendChild(imgWrap);
                leftDiv.appendChild(oppSpan);

                // 勝敗
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
                rightDiv.appendChild(resultSpan);

                li.appendChild(leftDiv);
                li.appendChild(rightDiv);
                breakdownList.appendChild(li);
                autoShrinkText(oppSpan);
            });
        }

        breakdownInlineContainer.classList.remove('hidden');
    }

    // ---- イベントリスナー設定 ----

    // 勝敗記録画面の戻るボタン
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
            selectedPlayerDisplay.classList.add('hidden');
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

        if (confirm(`このマッチアップの対戦履歴（全${history.length} 件）を本当にすべて消去しますか？\nこの操作は元に戻せません。`)) {
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
            // 画像ファイルのパスを組み立てる
            const imgPath = `images/${charName}.jpg`;

            // 画像要素を作成して読み込みを試みる
            const img = document.createElement('img');
            img.src = imgPath;
            img.alt = charName;
            img.className = 'char-img';

            // 画像の読み込みに成功した場合のみ表示する
            img.addEventListener('load', () => {
                btn.classList.add('has-image');
                btn.insertBefore(img, btn.firstChild);

                // ラベルが1行に収まるようフォントサイズを自動調整
                requestAnimationFrame(() => {
                    let fontSize = 10;
                    label.style.fontSize = fontSize + 'px';
                    while (label.scrollWidth > label.offsetWidth && fontSize > 6) {
                        fontSize -= 0.1;
                        label.style.fontSize = fontSize + 'px';
                    }
                });
            });

            // ラベルテキスト
            const label = document.createElement('span');
            label.className = 'char-label';
            label.textContent = charName;
            btn.appendChild(label);
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

                    // 選択したキャラを表示
                    playerNameText.textContent = characterList[charId];
                    selectedPlayerDisplay.classList.remove('hidden');
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
