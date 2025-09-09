import { useState } from "react";
import Home from "./components/home/home.component";
import Game from "./components/game/game.component";

export default function App(props) {

    // const [ready, set] = useState(false)
    const [showGame, setShowGame] = useState(false);

    // const ctx = useContext(IdnContext);

    // useEffect(() => {console.log(ctx)}, [ctx]);

    const handleShowGame = () => {
        setShowGame(true)
        // set(true)
    }

    const handleOnExit = () => {
        setShowGame(false);
    }

    const handleDisconnect = () => {
        props.onDisconnect()
        
    }

    return (
        <>
            {!showGame ?
                <Home onEnterGame={ handleShowGame } onDisconnect={ handleDisconnect }/> :
                <div className={`fullscreen bg ready`}>
                    <Game onExit={handleOnExit} />
                </div>
            }
        </>
    );
}
