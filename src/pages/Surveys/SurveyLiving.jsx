import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar';
import Slider from './components/Slider';
import RadioBtnGroup from '../../components/RadioBtnGroup';
import MoveBtnGroup from '../../components/MoveBtnGroup';
import { loadSurveyDraft, saveSurveyDraft } from './surveyDraft.js';

function SurveyLiving() {
    const navigate = useNavigate();
    const [smokingStatus, setSmokingStatus] = useState(() => loadSurveyDraft().smokingStatus ?? 0);
    const [eatingInRoom, setEatingInRoom] = useState(() => loadSurveyDraft().eatingInRoom ?? 1);
    const [temperaturePreference, setTemperaturePreference] = useState(() => loadSurveyDraft().temperaturePreference ?? 1);
    const [speakerStyle, setSpeakerStyle] = useState(() => loadSurveyDraft().speakerStyle ?? 1);
    const [callInRoom, setCallInRoom] = useState(() => loadSurveyDraft().callInRoom ?? 1);

    useEffect(() => {
        saveSurveyDraft({ smokingStatus, eatingInRoom, temperaturePreference, speakerStyle, callInRoom });
    }, [smokingStatus, eatingInRoom, temperaturePreference, speakerStyle, callInRoom]);

    return(
        <main className="relative min-h-dvh p-5 flex flex-col bg-brand-background pb-[calc(16px+env(safe-area-inset-bottom))]">
            <ProgressBar current={4}/>
            <header className="flex flex-col my-6 gap-1">
                <p className="font-heading font-bold text-xs text-fg-secondary">
                    생활
                </p>
                <h1 className="font-heading font-extrabold text-lg text-fg-primary">
                    방 안 생활 습관
                </h1>
                <p className="font-heading text-xs text-fg-basic-muted">

                </p>
            </header>
            <section className="flex flex-col flex-1 gap-8">
                <RadioBtnGroup
                    name="smokingStatus"
                    label="흡연 여부"
                    items={[
                        {item: "흡연자", value:1},
                        {item: "비흡연자", value:0}
                    ]}
                    onChange={setSmokingStatus}
                    className="flex-1"
                    layout=""
                    labelStyle="block text-sm font-bold text-fg-basic"
                />
                <RadioBtnGroup
                    name="eatingInRoom"
                    label="방 안 취식"
                    items={[
                        {item: "자주", value:1},
                        {item: "가끔", value:2},
                        {item: "안함", value:3},
                    ]}
                    onChange={setEatingInRoom}
                    className="flex-1"
                    layout=""
                    labelStyle="block text-sm font-bold text-fg-basic"
                />
                <RadioBtnGroup
                    name="temperaturePreference"
                    label="실내 온도 선호"
                    items={[
                        {item: "시원하게", value:1},
                        {item: "적당히", value:2},
                        {item: "따뜻하게", value:3},
                    ]}
                    onChange={setTemperaturePreference}
                    className="flex-1"
                    layout=""
                    labelStyle="block text-sm font-bold text-fg-basic"
                />
                <RadioBtnGroup
                    name="speakerStyle"
                    label="음악·영상 감상 방식"
                    items={[
                        {item: "이어폰", value:1},
                        {item: "스피커", value:2},
                        {item: "둘 다", value:3},
                    ]}
                    onChange={setSpeakerStyle}
                    className="flex-1"
                    layout=""
                    labelStyle="block text-sm font-bold text-fg-basic"
                />
                <RadioBtnGroup
                    name="callInRoom"
                    label="방 안 통화 여부"
                    items={[
                        {item: "자유롭게", value:1},
                        {item: "이어폰", value:2},
                        {item: "나가서", value:3},
                    ]}
                    onChange={setCallInRoom}
                    className="flex-1"
                    layout=""
                    labelStyle="block text-sm font-sans font-bold text-fg-basic"
                />
            </section>
            <MoveBtnGroup
                prev='/surveys/clean'
                onNext={() => navigate('/surveys/introduce')}
            />
        </main>
    );
}

export default SurveyLiving;
