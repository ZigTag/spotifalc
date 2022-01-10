import React, { useState } from 'react';
// import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';
import useInterval from './utils/useInterval';
import noMusicIcon from '../assets/Music_Icon.png';

import { AlbumSection, ControlSection } from './pages/NowPlaying';

// type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

// const Button: React.FC<ButtonProps> = ({ id, className, onClick, isClose, children }: PropsWithChildren<ButtonProps>) => (
//     <button
//         type="button"
//         className={
//             `w-12 h-full flex flex-row justify-center items-center text-black text-opacity-50
//             ${isClose ? 'hover:bg-red-500 hover:bg-opacity-50' : 'hover:bg-black hover:bg-opacity-10'} ${className}`
//         }
//         onClick={onClick ?? (() => {})}
//         id={id}
//     >
//         {children}
//     </button>
// );

// const TopBar: React.FC = () => (
//     <div className="h-8 w-full bg-[#0B0B0B] bg-opacity-25 select-none fixed" data-tauri-drag-region>
//         <div className="h-full w-min ml-auto flex flex-row">
//             <Button onClick={appWindow.minimize}><IconMinus size="15" /></Button>
//             <Button onClick={appWindow.maximize}><IconRectangle size="15" /></Button>
//             <Button onClick={appWindow.close} isClose><IconX size="15" /></Button>
//         </div>
//     </div>
// );

const App: React.FC = () => {
    const [currentlyPlaying, setCurrentlyPlaying] = useState<any>();

    // Detects if currently playing state is set and changes it to '' if it doesn't
    const currentlyPlayingAlbumUrl = currentlyPlaying
        ? currentlyPlaying.item.album.images[0].url
        : noMusicIcon;

    const getCurrentlyPlaying = () => {
        invoke('get_currently_playing').then((r) => {
            setCurrentlyPlaying(r);
        });
    };

    useInterval(() => {
        getCurrentlyPlaying();
    }, (1000));

    return (
        <div className="overflow-hidden">
            <div
                className="w-screen h-screen relative bg-center bg-cover bg-no-repeat transform scale-125"
                style={{
                    background: `url(${currentlyPlayingAlbumUrl})`,
                    filter: 'blur(50px)',
                }}
            />
            <div
                className="w-screen h-screen absolute top-0 left-0"
                style={{ backgroundColor: 'rgba(68, 68, 68, 0.1)' }}
            >
                {/* Disable until they fix decorations.
                    <TopBar />
                */}
                <div className="h-full overflow-y-hidden flex flex-row items-center align-center">
                    <div className="ml-8 mr-8">
                        <div>
                            <AlbumSection currentlyPlaying={currentlyPlaying} />
                            <ControlSection currentlyPlaying={currentlyPlaying} />
                        </div>
                    </div>
                    <div className="w-1/2 h-full bg-[#1B1B1B] bg-opacity-25 font-roboto text-white">
                        <p className="font-medium text-sm mx-4 my-2">Currently Playing</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
