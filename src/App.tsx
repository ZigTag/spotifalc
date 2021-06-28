import React, { useState } from 'react';
// import { IconX, IconRectangle, IconMinus } from '@tabler/icons';
// import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';
import useInterval from './lib/useInterval';

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
    const [currentlyPlaying, setCurrentlyPlaying] = useState<unknown>();

    const currentlyPlayingAlbumName = currentlyPlaying ? currentlyPlaying.item.album.name : '';
    const currentlyPlayingAlbumUrl = currentlyPlaying ? currentlyPlaying.item.album.images[0].url : '';
    const currentlyPlayingSong = currentlyPlaying ? currentlyPlaying.item.name : 'No song playing';
    const currentlyPlayingArtists = currentlyPlaying ? Array.from(currentlyPlaying.item.artists, (artist) => artist.name) : ['-'];
    const currentlyPlayingAlbum = currentlyPlaying ? currentlyPlaying.item.album.name : '-';
    const currentlyPlayingProgress = currentlyPlaying ? currentlyPlaying.progress_ms : 0;
    const currentlyPlayingDuration = currentlyPlaying ? currentlyPlaying.item.duration_ms : 1;

    const currentlyPlayingPercentage = Math.round((currentlyPlayingProgress / currentlyPlayingDuration) * 1000) / 10;

    const getCurrentlyPlaying = () => {
        invoke('get_currently_playing').then((r) => {
            setCurrentlyPlaying(r);
        });
    };

    useInterval(() => {
        getCurrentlyPlaying();
    }, (1000));

    return (
        <>
            <div
                className="w-screen h-screen relative"
                style={{
                    background: `url(${currentlyPlayingAlbumUrl})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
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
                <div className="pt-8 h-full overflow-y-hidden flex items-center align-center">
                    <div className="ml-4">
                        <div className="flex flex-row space-x-4 mb-6">
                            <img
                                src={currentlyPlayingAlbumUrl}
                                className="w-1/3 h-1/3"
                                alt={currentlyPlayingAlbumName}
                            />
                            <div className="self-end flex flex-col text-white font-roboto">
                                <span className="leading-none text-md">{currentlyPlayingArtists.join(', ')}</span>
                                <span className="leading-none font-bold text-2xl mb-0.5">{currentlyPlayingSong}</span>
                                <span className="leading-none text-md">{currentlyPlayingAlbum}</span>
                            </div>
                        </div>
                        <div className="h-1 bg-[#868686] bg-opacity-[58%] rounded-full">
                            <div
                                className="h-full bg-white relative rounded-full flex"
                                style={{ width: `${currentlyPlayingPercentage}%` }}
                            >
                                <div className="h-3 w-3 rounded-full bg-white absolute right-0 self-center" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;
