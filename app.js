// Constants & State
const STORAGE_KEY = 'deer_survey_logs';
const DRAFT_KEY = 'deer_survey_draft';
const JOBS_KEY = 'deer_survey_jobs';
let currentLogs = [];
let jobNames = [];
let areaCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLogs();
    loadJobs();
    injectVirtualData();
    setupNavigation();
    setupForm();
    setupLogManager();
    setupJobSettings();
});

// Virtual Data Injection for Debugging
function injectVirtualData() {
    if (currentLogs.length === 0) {
        const dummyData = [
            {
                id: "dummy_1",
                timestamp: new Date().toISOString(),
                date: "2026-04-20",
                start: "09:00",
                end: "10:30",
                weather: "晴れ",
                project: "仮想データテスト調査",
                surveyor: "テスト調査員A",
                mesh: "5339-12",
                cannot_survey: "無",
                areas: [
                    { id: 1, vegetation: "A, C", undergrowth: "少ない", sasa: "なし", deer_male: 2, deer_female: 1, footprint: 0, voice: 1, pellet_new: 10, pellet_mid: 5, pellet_old: 2, pellet_under10_new: 0, pellet_under10_mid: 0, pellet_under10_old: 0, notes: "シカを目撃" },
                    { id: 2, vegetation: "B", undergrowth: "多い", sasa: "多い", deer_male: 0, deer_female: 0, footprint: 3, voice: 0, pellet_new: 0, pellet_mid: 15, pellet_old: 8, pellet_under10_new: 2, pellet_under10_mid: 1, pellet_under10_old: 0, notes: "足跡多数" }
                ]
            },
            {
                id: "dummy_2",
                timestamp: new Date().toISOString(),
                date: "2026-04-21",
                start: "11:00",
                end: "12:00",
                weather: "曇り",
                project: "仮想データテスト調査",
                surveyor: "テスト調査員B",
                mesh: "5339-13",
                cannot_survey: "無",
                areas: [
                    { id: 1, vegetation: "D", undergrowth: "極多", sasa: "少ない", deer_male: 0, deer_female: 3, footprint: 1, voice: 0, pellet_new: 0, pellet_mid: 0, pellet_old: 0, pellet_under10_new: 0, pellet_under10_mid: 0, pellet_under10_old: 0, notes: "メス鹿の群れ" }
                ]
            }
        ];
        currentLogs = dummyData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
        
        if (!jobNames.includes("仮想データテスト調査")) {
            jobNames.push("仮想データテスト調査");
            localStorage.setItem(JOBS_KEY, JSON.stringify(jobNames));
        }
    }
}

function loadJobs() {
    const saved = localStorage.getItem(JOBS_KEY);
    if (saved) {
        try { jobNames = JSON.parse(saved); } catch(e) { console.error('Parse error', e); }
    }
}

function setupJobSettings() {
    const select = document.getElementById('home-job-select');
    const input = document.getElementById('home-job-input');
    const btnAdd = document.getElementById('btn-add-job');
    const projectInput = document.getElementById('project-name');

    function renderJobSelect() {
        select.innerHTML = '<option value="">選択してください</option>';
        jobNames.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job;
            opt.textContent = job;
            select.appendChild(opt);
        });
        
        // 前回の入力内容を踏襲
        const lastBaseInfo = localStorage.getItem('deer_survey_last_base_info');
        if (lastBaseInfo) {
            try {
                const data = JSON.parse(lastBaseInfo);
                if (data.project && jobNames.includes(data.project)) {
                    select.value = data.project;
                    projectInput.value = data.project;
                }
            } catch(e) {}
        }
    }

    renderJobSelect();

    select.addEventListener('change', () => {
        projectInput.value = select.value;
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnAdd.click();
        }
    });

    btnAdd.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
            if (!jobNames.includes(val)) {
                jobNames.push(val);
                localStorage.setItem(JOBS_KEY, JSON.stringify(jobNames));
                renderJobSelect();
                select.value = val;
                projectInput.value = val;
                input.value = '';
                showToast('業務名を登録しました');
            } else {
                alert('既に登録されている業務名です');
            }
        }
    });
}

// --- Navigation ---
function setupNavigation() {
    const defaultScreen = 'screen-home';
    const btnBackHome = document.getElementById('btn-back-home');
    
    // Set initial date to today
    document.getElementById('survey-date').valueAsDate = new Date();

    // Set initial time to now
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    document.getElementById('survey-start-time').value = timeStr;

    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            showScreen(targetId);
        });
    });

    btnBackHome.addEventListener('click', () => {
        showScreen('screen-home');
    });

    // Handle PWA install prompt
    let deferredPrompt;
    const installPrompt = document.getElementById('install-prompt');
    const btnInstall = document.getElementById('btn-install');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPrompt.classList.remove('hidden');
    });

    btnInstall.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installPrompt.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    const btnBackHome = document.getElementById('btn-back-home');
    if (screenId === 'screen-home') {
        btnBackHome.classList.add('hidden');
    } else {
        btnBackHome.classList.remove('hidden');
        if(screenId === 'screen-logs') renderLogs();
        if(screenId === 'screen-analysis') renderAnalysis();
    }
    window.scrollTo(0, 0);
}

// --- Survey Form ---
function setupForm() {
    const btnAddArea = document.getElementById('btn-add-area');
    const form = document.getElementById('survey-form');
    const btnSuspend = document.getElementById('btn-suspend-survey');
    const btnCancel = document.getElementById('btn-cancel-survey');
    
    // Add first area by default, or restore from draft
    if (!restoreSurveyDraft()) {
        loadLastBaseInfo();
        addAreaBlock();
    }

    btnAddArea.addEventListener('click', () => {
        addAreaBlock();
        saveSurveyDraft();
        showToast('自動保存しました');
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSurvey();
    });

    btnSuspend.addEventListener('click', () => {
        saveSurveyDraft();
        showToast('一時保存して中断しました');
        setTimeout(() => showScreen('screen-home'), 500);
    });

    btnCancel.addEventListener('click', () => {
        if (confirm('保存せずに終了しますか？現在入力中のデータは破棄されます。')) {
            localStorage.removeItem(DRAFT_KEY);
            form.reset();
            document.getElementById('survey-date').valueAsDate = new Date();
            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            document.getElementById('survey-start-time').value = timeStr;
            document.getElementById('areas-container').innerHTML = '';
            areaCount = 0;
            addAreaBlock();
            showScreen('screen-home');
        }
    });

    // Auto-save whenever an input changes
    form.addEventListener('input', () => {
        saveSurveyDraft();
    });
}

function createCounterHTML(id, label) {
    return `
        <div class="input-group" style="margin-bottom:8px;">
            <label>${label}</label>
            <div class="counter-widget">
                <button type="button" class="btn-counter" onclick="updateCounter('${id}', -1)">-</button>
                <div class="counter-val" id="${id}">0</div>
                <button type="button" class="btn-counter" onclick="updateCounter('${id}', 1)">+</button>
            </div>
            <input type="hidden" name="${id}" id="input-${id}" value="0">
        </div>
    `;
}

window.updateCounter = function(id, change) {
    const display = document.getElementById(id);
    const input = document.getElementById(`input-${id}`);
    if(!display || !input) return;
    
    let val = parseInt(input.value) || 0;
    val += change;
    if (val < 0) val = 0;
    
    display.textContent = val;
    input.value = val;
    saveSurveyDraft();
}

function addAreaBlock(forceId = null, draftData = null) {
    if (forceId === null) {
        areaCount++;
    }
    const areaId = forceId !== null ? forceId : areaCount;
    const container = document.getElementById('areas-container');
    
    const div = document.createElement('div');
    div.className = 'area-block';
    div.id = `area-block-${areaId}`;
    
    div.innerHTML = `
        <div class="area-header">
            <h4>区域 ${areaId}</h4>
            ${areaId > 1 ? `<button type="button" class="btn-remove-area" onclick="removeAreaBlock(${areaId})"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
        </div>
        
        <div class="input-group">
            <label>植生タイプ (最大3つまで)</label>
            <div class="checkbox-grid veg-group" id="veg-group-${areaId}">
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="A"> A: 落葉広葉樹林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="B"> B: 常緑広葉樹林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="C"> C: マツ林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="D"> D: 伐採跡地</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="E"> E: スギ・ヒノキ幼齢林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="F"> F: スギ・ヒノキ老齢林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="G"> G: スギヒノキ植林(制限無)</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="H"> H: 草地</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="I"> I: カラマツ林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="J"> J: 常緑針葉樹林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="K"> K: 竹林</label>
                <label class="checkbox-label"><input type="checkbox" name="veg_${areaId}" value="L"> L: その他</label>
            </div>
        </div>
        
        <div class="input-row">
            <div class="input-group">
                <label>下層植生 (一般)</label>
                <select name="undergrowth_${areaId}">
                    <option value="なし">なし</option>
                    <option value="少ない">少ない</option>
                    <option value="多い">多い</option>
                    <option value="極多">極多</option>
                </select>
            </div>
            <div class="input-group">
                <label>ササ</label>
                <select name="sasa_${areaId}">
                    <option value="なし">なし</option>
                    <option value="少ない">少ない</option>
                    <option value="多い">多い</option>
                </select>
            </div>
        </div>

        <h5 style="margin:20px 0 10px; color:var(--text-muted);">シカ生体 (カウント)</h5>
        <div class="checkbox-grid">
            ${createCounterHTML(`area_${areaId}_deer_male`, '目撃(オス)')}
            ${createCounterHTML(`area_${areaId}_deer_female`, '目撃(メス)')}
            ${createCounterHTML(`area_${areaId}_footprint`, '足跡')}
            ${createCounterHTML(`area_${areaId}_voice`, '鳴き声')}
        </div>

        <h5 style="margin:20px 0 10px; color:var(--text-muted);">糞塊: 10粒以上</h5>
        <div class="checkbox-grid">
            ${createCounterHTML(`area_${areaId}_pellet_new`, '新')}
            ${createCounterHTML(`area_${areaId}_pellet_mid`, '中')}
            ${createCounterHTML(`area_${areaId}_pellet_old`, '旧')}
        </div>
        
        <h5 style="margin:20px 0 10px; color:var(--text-muted);">糞塊: 10粒未満</h5>
        <div class="checkbox-grid">
            ${createCounterHTML(`area_${areaId}_pellet_under10_new`, '新')}
            ${createCounterHTML(`area_${areaId}_pellet_under10_mid`, '中')}
            ${createCounterHTML(`area_${areaId}_pellet_under10_old`, '旧')}
        </div>
        
        <div class="input-group" style="margin-top: 16px;">
            <label>備考</label>
            <input type="text" name="notes_${areaId}" placeholder="気づいたことなど..." class="notes-input">
        </div>
    `;
    container.appendChild(div);

    const vegGroup = div.querySelector(`#veg-group-${areaId}`);
    vegGroup.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const checked = vegGroup.querySelectorAll('input[type="checkbox"]:checked');
            if (checked.length >= 3) {
                vegGroup.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(cb => cb.disabled = true);
            } else {
                vegGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = false);
            }
            saveSurveyDraft();
        }
    });

    if (draftData) {
        if (draftData.vegetation) {
            const vegArray = draftData.vegetation.split(', ');
            vegArray.forEach(v => {
                const cb = div.querySelector(`input[name="veg_${areaId}"][value="${v}"]`);
                if (cb) cb.checked = true;
            });
            const checked = div.querySelectorAll(`input[name="veg_${areaId}"]:checked`);
            if (checked.length >= 3) {
                div.querySelectorAll(`input[name="veg_${areaId}"]:not(:checked)`).forEach(cb => cb.disabled = true);
            }
        }
        if (draftData.undergrowth) div.querySelector(`select[name="undergrowth_${areaId}"]`).value = draftData.undergrowth;
        if (draftData.sasa) div.querySelector(`select[name="sasa_${areaId}"]`).value = draftData.sasa;
        if (draftData.notes) div.querySelector(`input[name="notes_${areaId}"]`).value = draftData.notes;
        
        const setCounter = (key, val) => {
            const inp = div.querySelector(`#input-${key}`);
            const disp = div.querySelector(`#${key}`);
            if(inp && disp) { inp.value = val || 0; disp.textContent = val || 0; }
        };
        setCounter(`area_${areaId}_deer_male`, draftData.deer_male);
        setCounter(`area_${areaId}_deer_female`, draftData.deer_female);
        setCounter(`area_${areaId}_footprint`, draftData.footprint);
        setCounter(`area_${areaId}_voice`, draftData.voice);
        setCounter(`area_${areaId}_pellet_new`, draftData.pellet_new);
        setCounter(`area_${areaId}_pellet_mid`, draftData.pellet_mid);
        setCounter(`area_${areaId}_pellet_old`, draftData.pellet_old);
        setCounter(`area_${areaId}_pellet_under10_new`, draftData.pellet_under10_new);
        setCounter(`area_${areaId}_pellet_under10_mid`, draftData.pellet_under10_mid);
        setCounter(`area_${areaId}_pellet_under10_old`, draftData.pellet_under10_old);
    }
}

window.removeAreaBlock = function(id) {
    const el = document.getElementById(`area-block-${id}`);
    if(el) {
        el.remove();
        saveSurveyDraft();
    }
}

function saveSurvey() {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const date = document.getElementById('survey-date').value;
    const start = document.getElementById('survey-start-time').value;
    const end = document.getElementById('survey-end-time').value;
    const weather = document.getElementById('survey-weather').value;
    const project = document.getElementById('project-name').value;
    const surveyor = document.getElementById('surveyor-name').value;
    const mesh = document.getElementById('mesh-no').value;
    const cannot_survey_el = document.querySelector('input[name="cannot-survey"]:checked');
    const cannot_survey = cannot_survey_el ? cannot_survey_el.value : '無';

    const areas = [];
    document.querySelectorAll('.area-block').forEach(block => {
        const blockId = block.id.split('-').pop();
        
        const vegBoxes = block.querySelectorAll(`input[name="veg_${blockId}"]:checked`);
        const vegetation = Array.from(vegBoxes).map(cb => cb.value).join(', ');
        const undergrowth = block.querySelector(`select[name="undergrowth_${blockId}"]`).value;
        const sasa = block.querySelector(`select[name="sasa_${blockId}"]`).value;
        const notes = block.querySelector(`input[name="notes_${blockId}"]`).value;
        
        areas.push({
            id: blockId,
            vegetation: vegetation,
            undergrowth: undergrowth,
            sasa: sasa,
            notes: notes,
            deer_male: parseInt(block.querySelector(`#input-area_${blockId}_deer_male`).value) || 0,
            deer_female: parseInt(block.querySelector(`#input-area_${blockId}_deer_female`).value) || 0,
            footprint: parseInt(block.querySelector(`#input-area_${blockId}_footprint`).value) || 0,
            voice: parseInt(block.querySelector(`#input-area_${blockId}_voice`).value) || 0,
            pellet_new: parseInt(block.querySelector(`#input-area_${blockId}_pellet_new`).value) || 0,
            pellet_mid: parseInt(block.querySelector(`#input-area_${blockId}_pellet_mid`).value) || 0,
            pellet_old: parseInt(block.querySelector(`#input-area_${blockId}_pellet_old`).value) || 0,
            pellet_under10_new: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_new`).value) || 0,
            pellet_under10_mid: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_mid`).value) || 0,
            pellet_under10_old: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_old`).value) || 0,
        });
    });

    const surveyData = {
        id,
        timestamp: new Date().toISOString(),
        date, start, end, weather, project, surveyor, mesh, cannot_survey,
        areas
    };

    currentLogs.push(surveyData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
    localStorage.removeItem(DRAFT_KEY);
    
    // 前回の入力内容を踏襲するために保存
    localStorage.setItem('deer_survey_last_base_info', JSON.stringify({
        project, surveyor, weather, mesh
    }));
    
    showToast('保存されました');
    
    // Reset Form
    document.getElementById('survey-form').reset();
    document.getElementById('survey-date').valueAsDate = new Date();
    loadLastBaseInfo(); // リセット直後に基本情報だけ復元
    
    document.getElementById('areas-container').innerHTML = '';
    areaCount = 0;
    addAreaBlock();
    
    // Go home
    setTimeout(() => {
        showScreen('screen-home');
    }, 1000);
}

function saveSurveyDraft() {
    const date = document.getElementById('survey-date').value;
    const start = document.getElementById('survey-start-time').value;
    const end = document.getElementById('survey-end-time').value;
    const weather = document.getElementById('survey-weather').value;
    const project = document.getElementById('project-name').value;
    const surveyor = document.getElementById('surveyor-name').value;
    const mesh = document.getElementById('mesh-no').value;
    const cannot_survey_el = document.querySelector('input[name="cannot-survey"]:checked');
    const cannot_survey = cannot_survey_el ? cannot_survey_el.value : '無';

    const areas = [];
    document.querySelectorAll('.area-block').forEach(block => {
        const blockId = block.id.split('-').pop();
        const vegBoxes = block.querySelectorAll(`input[name="veg_${blockId}"]:checked`);
        const vegetation = Array.from(vegBoxes).map(cb => cb.value).join(', ');
        const undergrowth = block.querySelector(`select[name="undergrowth_${blockId}"]`).value;
        const sasa = block.querySelector(`select[name="sasa_${blockId}"]`).value;
        const notes = block.querySelector(`input[name="notes_${blockId}"]`).value;
        
        areas.push({
            id: blockId,
            vegetation: vegetation,
            undergrowth: undergrowth,
            sasa: sasa,
            notes: notes,
            deer_male: parseInt(block.querySelector(`#input-area_${blockId}_deer_male`).value) || 0,
            deer_female: parseInt(block.querySelector(`#input-area_${blockId}_deer_female`).value) || 0,
            footprint: parseInt(block.querySelector(`#input-area_${blockId}_footprint`).value) || 0,
            voice: parseInt(block.querySelector(`#input-area_${blockId}_voice`).value) || 0,
            pellet_new: parseInt(block.querySelector(`#input-area_${blockId}_pellet_new`).value) || 0,
            pellet_mid: parseInt(block.querySelector(`#input-area_${blockId}_pellet_mid`).value) || 0,
            pellet_old: parseInt(block.querySelector(`#input-area_${blockId}_pellet_old`).value) || 0,
            pellet_under10_new: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_new`).value) || 0,
            pellet_under10_mid: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_mid`).value) || 0,
            pellet_under10_old: parseInt(block.querySelector(`#input-area_${blockId}_pellet_under10_old`).value) || 0,
        });
    });

    const draftData = { date, start, end, weather, project, surveyor, mesh, cannot_survey, areas };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
}

function restoreSurveyDraft() {
    const draftText = localStorage.getItem(DRAFT_KEY);
    if (!draftText) return false;
    try {
        const draft = JSON.parse(draftText);
        if (!draft.areas || draft.areas.length === 0) return false;

        if (draft.date) document.getElementById('survey-date').value = draft.date;
        if (draft.start) document.getElementById('survey-start-time').value = draft.start;
        if (draft.end) document.getElementById('survey-end-time').value = draft.end;
        if (draft.weather) document.getElementById('survey-weather').value = draft.weather;
        if (draft.project) document.getElementById('project-name').value = draft.project;
        if (draft.surveyor) document.getElementById('surveyor-name').value = draft.surveyor;
        if (draft.mesh) document.getElementById('mesh-no').value = draft.mesh;
        if (draft.cannot_survey) {
            const rad = document.querySelector(`input[name="cannot-survey"][value="${draft.cannot_survey}"]`);
            if (rad) rad.checked = true;
        }

        document.getElementById('areas-container').innerHTML = '';
        areaCount = 0;

        draft.areas.forEach(area => {
            const aid = parseInt(area.id);
            areaCount = Math.max(areaCount, aid);
            addAreaBlock(aid, area);
        });
        
        setTimeout(() => showToast('前回の未保存データを復元しました'), 500);
        return true;
    } catch(e) {
        console.error('Draft restore failed', e);
        return false;
    }
}

function loadLastBaseInfo() {
    const saved = localStorage.getItem('deer_survey_last_base_info');
    if(saved) {
        try {
            const data = JSON.parse(saved);
            if(data.project) document.getElementById('project-name').value = data.project;
            if(data.surveyor) document.getElementById('surveyor-name').value = data.surveyor;
            if(data.weather) document.getElementById('survey-weather').value = data.weather;
            if(data.mesh) document.getElementById('mesh-no').value = data.mesh;
        } catch(e) {}
    }
}

// --- Storage & Logs ---
function loadLogs() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { currentLogs = JSON.parse(saved); } catch(e) { console.error('Parse error', e); }
    }
}

function setupLogManager() {
    const chkAll = document.getElementById('checkbox-all');
    const btnDelete = document.getElementById('btn-delete-selected');
    const btnExport = document.getElementById('btn-export');

    chkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.log-checkbox').forEach(chk => {
            chk.checked = isChecked;
        });
        updateDeleteBtnState();
    });

    btnDelete.addEventListener('click', () => {
        if(!confirm('選択したデータを消去してもよろしいですか？')) return;
        
        const toDeleteIds = Array.from(document.querySelectorAll('.log-checkbox:checked')).map(c => c.value);
        currentLogs = currentLogs.filter(log => !toDeleteIds.includes(log.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
        
        renderLogs();
        chkAll.checked = false;
        updateDeleteBtnState();
        showToast('消去しました');
    });

    btnExport.addEventListener('click', exportToCSV);
}

function renderLogs() {
    const tbody = document.getElementById('logs-tbody');
    const emptyState = document.getElementById('logs-empty-state');
    
    tbody.innerHTML = '';
    
    if(currentLogs.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    [...currentLogs].reverse().forEach(log => {
        const totalAreas = log.areas.length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="log-checkbox" value="${log.id}" onchange="updateDeleteBtnState()"></td>
            <td>${log.date}</td>
            <td>${log.project || '未入力'}</td>
            <td>${log.mesh || '未入力'}</td>
            <td style="font-size:0.8rem; color:var(--text-muted);">${totalAreas} 区域</td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateDeleteBtnState = function() {
    const checkedCount = document.querySelectorAll('.log-checkbox:checked').length;
    document.getElementById('btn-delete-selected').disabled = checkedCount === 0;
}

// --- Analysis ---
function renderAnalysis() {
    const meshSelect = document.getElementById('analysis-mesh-select');
    // Get unique meshes
    const meshes = [...new Set(currentLogs.map(l => l.mesh).filter(Boolean))];
    
    // Rebuild select options
    const currentVal = meshSelect.value;
    meshSelect.innerHTML = '<option value="">すべてのメッシュ</option>';
    meshes.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        meshSelect.appendChild(opt);
    });
    meshSelect.value = meshes.includes(currentVal) ? currentVal : "";

    meshSelect.onchange = () => updateAnalysisDashboard(meshSelect.value);
    updateAnalysisDashboard(meshSelect.value);
}

function updateAnalysisDashboard(selectedMesh) {
    const filteredLogs = selectedMesh ? currentLogs.filter(l => l.mesh === selectedMesh) : currentLogs;
    
    let tAreas = 0, tDeer = 0, tPelletsHigh = 0;
    
    filteredLogs.forEach(log => {
        tAreas += log.areas.length;
        log.areas.forEach(a => {
            tDeer += (a.deer_male || 0) + (a.deer_female || 0) + (a.deer || 0);
            tPelletsHigh += (a.pellet_new + a.pellet_mid + a.pellet_old);
        });
    });

    document.getElementById('stat-total-areas').textContent = tAreas;
    document.getElementById('stat-total-deer').textContent = tDeer;
    document.getElementById('stat-total-pellets-high').textContent = tPelletsHigh;
}

// --- Utils ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function exportToCSV() {
    if(currentLogs.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }

    let csvContent = "\uFEFF";
    // Header
    const headers = [
        "ID", "日付", "開始", "終了", "天候", "業務名", "調査者", "メッシュNO", "調査不能",
        "区域番号", "植生(A-L)", "下層植生", "ササ", "シカ目撃(オス)", "シカ目撃(メス)", "足跡", "鳴き声",
        "糞塊10+新", "糞塊10+中", "糞塊10+旧", "糞塊10-新", "糞塊10-中", "糞塊10-旧", "備考"
    ];
    csvContent += headers.join(",") + "\n";

    currentLogs.forEach(log => {
        log.areas.forEach(area => {
            const row = [
                `"${log.id}"`, `"${log.date}"`, `"${log.start}"`, `"${log.end}"`, `"${log.weather}"`, `"${log.project || ''}"`, `"${log.surveyor || ''}"`, `"${log.mesh || ''}"`, `"${log.cannot_survey || '無'}"`,
                area.id, 
                `"${area.vegetation || ''}"`, 
                `"${area.undergrowth || ''}"`,
                `"${area.sasa || ''}"`,
                area.deer_male !== undefined ? area.deer_male : (area.deer || 0),
                area.deer_female || 0,
                area.footprint, area.voice,
                area.pellet_new, area.pellet_mid, area.pellet_old, 
                area.pellet_under10_new || 0, area.pellet_under10_mid || 0, area.pellet_under10_old || 0,
                `"${area.notes || ''}"`
            ];
            csvContent += row.join(",") + "\n";
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `deer_survey_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
