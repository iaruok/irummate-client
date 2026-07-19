import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import TextArea from './components/TextArea.jsx'
import ProgressBar from '../../components/ProgressBar.jsx'
import MoveBtnGroup from '../../components/MoveBtnGroup.jsx'
import MultipleBtnGroup from './components/MultipleBtnGroup.jsx';
import { clearSurveyDraft, loadSurveyDraft, saveSurveyDraft } from './surveyDraft.js';
import { postSurveys } from '../../api/surveys/surveys.js';

function SurveyIntroduce() {
    const navigate = useNavigate();
    const [introduce, setIntroduce] = useState(() => loadSurveyDraft().introduce ?? '');
    const [visibleProfileFields, setVisibleProfileFields] = useState(() => loadSurveyDraft().visibleProfileFields ?? []);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        saveSurveyDraft({ introduce, visibleProfileFields });
    }, [introduce, visibleProfileFields]);

    async function handleNext() {
        if (!introduce.trim()) {
            setErrorMessage('자기소개를 입력해주세요.');
            return;
        }
        if (visibleProfileFields.length < 1) {
            setErrorMessage('중요하게 생각하는 항목을 최소 1개 선택해주세요.');
            return;
        }

        const draft = loadSurveyDraft();
        const requestBody = {
            smokingStatus: draft.smokingStatus,
            introduce,
            answers: {
                bedtime: draft.bedtime,
                snoring: draft.snoring,
                sleepTalking: draft.sleepTalking,
                organizingStyle: draft.organizingStyle,
                eatingInRoom: draft.eatingInRoom,
                temperaturePreference: draft.temperaturePreference,
                showerFrequency: draft.showerFrequency,
                speakerStyle: draft.speakerStyle,
                callInRoom: draft.callInRoom,
            },
            visibleProfileFields,
        };

        try {
            setErrorMessage('');
            const responseBody = await postSurveys(requestBody);
            console.log(responseBody.message);
            clearSurveyDraft();
            navigate('/certification');
        } catch (error) {
            console.error(error);
            setErrorMessage('제출에 실패했어요. 잠시 후 다시 시도해주세요.');
        }
    }

    return (
        <main className="relative min-h-dvh p-5 flex flex-col bg-brand-background pb-[calc(16px+env(safe-area-inset-bottom))]">
            <ProgressBar current={5}/>
            <header className="flex flex-col my-6 gap-1">
                <p className="font-heading font-bold text-xs text-fg-secondary">
                    
                </p>
                <h1 className="font-heading font-extrabold text-lg text-fg-primary">
                    나는 이런 사람이에요.
                </h1>
                <p className="font-heading text-xs text-fg-basic-muted">

                </p>
            </header>
            <section className="flex flex-col flex-1 gap-8">
                <TextArea
                    label="자기소개"
                    placeholder="본인을 소개해주세요!"
                    value={introduce}
                    onChange={setIntroduce}
                />
                <MultipleBtnGroup
                    label="중요하게 생각하는 항목"
                    value={visibleProfileFields}
                    items={[
                        {item: "취침 시간대", value:"BEDTIME"},
                        {item: "코골이", value:"SNORING"},
                        {item: "잠꼬대", value:"SLEEP_TALKING"},
                        {item: "정리정돈수준", value:"ORGANIZING_STYLE"},
                        {item: "샤워 빈도", value:"SHOWER_FREQUENCY"},
                        {item: "방안 취식", value:"EATING_IN_ROOM"},
                        {item: "실내 온도 선호", value:"TEMPERATURE_PREFERENCE"},
                        {item: "음악·영상 감상 방식", value:"SPEAKER_STYLE"},
                        {item: "방안 통화 여부", value:"CALL_IN_ROOM"},
                    ]}
                    onChange={setVisibleProfileFields}
                />
            </section>
            {errorMessage && (
                <p className="mb-3 text-xs font-bold text-[#c04a67]" role="alert">
                    {errorMessage}
                </p>
            )}
            <MoveBtnGroup
                prev='/surveys/living'
                onNext={handleNext}
            />
        </main>
    );
}

export default SurveyIntroduce;
