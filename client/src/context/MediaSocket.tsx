import {
    createContext,
    useContext,
    useRef,
    useState
} from "react";

const MediaContext =
    createContext<any>(null);

export function MediaProvider({

    children

}:{

children:React.ReactNode

}){

const streamRef=

useRef<MediaStream|null>(null);

const [ready,setReady]=

useState(false);

const initializeMedia=

async()=>{

if(streamRef.current){

return streamRef.current;

}

const stream=

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

setReady(true);

return stream;

};

return(

<MediaContext.Provider

value={{

stream:streamRef.current,

ready,

initializeMedia

}}

>

{children}

</MediaContext.Provider>

);

}

export const useMedia=()=>

useContext(MediaContext);


