import React, {
    createContext,
    useContext
} from "react";

import { socket } from "../services/socket.ts";

const SocketContext =
    createContext(socket);

export const SocketProvider = ({
    children
}:{
    children:React.ReactNode
})=>{

    return(

        <SocketContext.Provider value={socket}>

            {children}

        </SocketContext.Provider>

    );

};

export const useSocket=()=>useContext(SocketContext);


