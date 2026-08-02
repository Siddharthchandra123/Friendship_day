import React, {
    createContext,
    useContext,
    useRef,
    useState
} from "react";

type MediaContextType = {

    stream: MediaStream | null;

    cameraReady: boolean;

    microphoneReady: boolean;

    initializeMedia: () => Promise<MediaStream>;

    stopMedia: () => void;

};

const MediaContext =
createContext<MediaContextType | null>(null);

export const MediaProvider = ({
    children
}:{
    children:React.ReactNode
})=>{

    const streamRef =
    useRef<MediaStream | null>(null);

    const [cameraReady,setCameraReady]=
    useState(false);

    const [microphoneReady,setMicrophoneReady]=
    useState(false);

    const initializeMedia = async()=>{

        if(streamRef.current){

            return streamRef.current;

        }

        const stream =
        await navigator.mediaDevices.getUserMedia({

            video:{
                width:{ideal:640},
                height:{ideal:360},
                frameRate:{ideal:15}
            },

            audio:{
                echoCancellation:true,
                noiseSuppression:true,
                autoGainControl:true
            }

        });

        streamRef.current=stream;

        setCameraReady(true);

        setMicrophoneReady(true);

        return stream;

    };

    const stopMedia=()=>{

        streamRef.current
            ?.getTracks()
            .forEach(track=>track.stop());

        streamRef.current=null;

        setCameraReady(false);

        setMicrophoneReady(false);

    };

    return(

        <MediaContext.Provider
        value={{

            stream:streamRef.current,

            cameraReady,

            microphoneReady,

            initializeMedia,

            stopMedia

        }}>

            {children}

        </MediaContext.Provider>

    );

};

export const useMedia=()=>{

    const context=
    useContext(MediaContext);

    if(!context){

        throw new Error(
            "useMedia must be inside MediaProvider"
        );

    }

    return context;

};