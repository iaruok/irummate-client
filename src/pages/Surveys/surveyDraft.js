const STORAGE_KEY = 'surveyDraft';

export function loadSurveyDraft() {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
        return {};
    }
}

export function saveSurveyDraft(partialDraft) {
    const draft = { ...loadSurveyDraft(), ...partialDraft };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return draft;
}

export function clearSurveyDraft() {
    sessionStorage.removeItem(STORAGE_KEY);
}
