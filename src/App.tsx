import React, { useEffect, useState } from 'react';
import {
    // IconX,
    // IconRectangle,
    // IconMinus,
    IconPlayerPlay,
    IconPlayerTrackPrev,
    IconPlayerTrackNext,
    IconArrowForwardUp,
    IconArrowBackUp, IconHeart, IconPlayerPause,
} from '@tabler/icons';
// import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';
import useInterval from './lib/useInterval';

import noMusicIcon from '../assets/Music_Icon.png';

// type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

type ProgressBarType = {
    currentlyPlaying: any,
}

type ControlButtonsType = {
    currentlyPlaying: any,
}

type ControlSectionType = {
    currentlyPlaying: any,
}

type AlbumSectionType = {
    currentlyPlaying: any,
}

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

const leadingZero = (num: Number): String => {
    const numString = num.toString();

    return num < 10 ? `0${numString}` : numString;
};

const ProgressBar: React.FC<ProgressBarType> = ({ currentlyPlaying }) => {
    const progress = currentlyPlaying
        ? currentlyPlaying.progress_ms
        : 1;
    const duration = currentlyPlaying
        ? currentlyPlaying.item.duration_ms
        : 1;

    const percentage = Math.round((progress / duration) * 1000) / 10;

    const progressAsTime = new Date(progress);
    const progressAsString = `${leadingZero(progressAsTime.getMinutes())}:${leadingZero(progressAsTime.getSeconds())}`;

    const durationAsTime = new Date(duration);
    const durationAsString = `${leadingZero(durationAsTime.getMinutes())}:${leadingZero(durationAsTime.getSeconds())}`;

    return (
        <div className="flex-col">
            <div className="h-1 bg-[#868686] bg-opacity-[58%] rounded-full">
                <div
                    className="h-full bg-white rounded-full flex"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="h-full w-full opacity-0 hover:opacity-100 relative flex items-center">
                        <div className="h-3 w-3 rounded-full bg-white absolute -right-1.5" />
                    </div>
                </div>
            </div>
            <div className="w-full mt-0.5 flex flex-row font-roboto font-bold text-white text-xs">
                <span>{progressAsString}</span>
                <span className="ml-auto">{durationAsString}</span>
            </div>
        </div>
    );
};

const AlbumSection: React.FC<AlbumSectionType> = ({ currentlyPlaying }) => {
    const currentlyPlayingAlbumName = currentlyPlaying
        ? currentlyPlaying.item.album.name
        : '';
    const currentlyPlayingAlbumUrl = currentlyPlaying
        ? currentlyPlaying.item.album.images[0].url
        : noMusicIcon;
    const currentlyPlayingSong = currentlyPlaying
        ? currentlyPlaying.item.name
        : 'No song playing';
    // Takes an array of Artists and turns it into an array of strings with the artists names
    const currentlyPlayingArtists = currentlyPlaying
        ? Array.from(currentlyPlaying.item.artists, (artist: any) => artist.name)
        : [''];

    return (
        <div className="flex flex-row space-x-4 mb-6">
            <img
                src={currentlyPlayingAlbumUrl}
                className="w-1/3 h-1/3"
                alt={currentlyPlayingAlbumName}
            />
            <div className="self-end flex flex-col text-white font-roboto">
                <span className="leading-none text-md">{currentlyPlayingArtists.join(', ')}</span>
                <span className="leading-none font-bold text-2xl mb-0.5">{currentlyPlayingSong}</span>
                <span className="leading-none text-md">{currentlyPlayingAlbumName}</span>
            </div>
        </div>
    );
};

const ControlButtons: React.FC<ControlButtonsType> = ({ currentlyPlaying }) => {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        const masterIsPlaying = currentlyPlaying
            ? currentlyPlaying.is_playing
            : false;

        if (isPlaying !== masterIsPlaying) {
            setIsPlaying(masterIsPlaying);
        }
    }, [currentlyPlaying.is_playing]);

    const pausePlayback = () => {
        invoke('pause_playback').then();
        setIsPlaying(!isPlaying);
    };

    const startPlayback = () => {
        invoke('start_playback').then();
        setIsPlaying(!isPlaying);
    };

    const nextTrack = () => {
        invoke('next_track').then();
    };

    const previousTrack = () => {
        invoke('previous_track').then();
    };

    return (
        <div className="mt-2 flex flex-row justify-center space-x-8">
            <button
                type="button"
                className="relative"
            >
                <IconArrowBackUp size={30} color="#FFF" />
                <span className="absolute bottom-1 left-0.5 text-[0.7rem] text-white font-roboto">10</span>
            </button>
            <button
                type="button"
                onClick={previousTrack}
            >
                <IconPlayerTrackPrev size={30} fill="#FFF" color="#FFF" strokeWidth="4" />
            </button>
            {isPlaying
                ? (
                    <button
                        type="button"
                        onClick={pausePlayback}
                    >
                        <IconPlayerPause size={40} fill="#FFF" color="#FFF" strokeWidth="2" />
                    </button>
                )
                : (
                    <button
                        type="button"
                        onClick={startPlayback}
                    >
                        <IconPlayerPlay size={40} fill="#FFF" color="#FFF" strokeWidth="4" />
                    </button>
                )}
            <button
                type="button"
                onClick={nextTrack}
            >
                <IconPlayerTrackNext size={30} fill="#FFF" color="#FFF" strokeWidth="4" />
            </button>
            <button
                type="button"
                className="relative"
            >
                <IconArrowForwardUp size={30} color="#FFF" />
                <span className="absolute bottom-1 right-0.5 text-[0.7rem] text-white font-roboto">10</span>
            </button>
            <button
                type="button"
                className="relative"
            >
                <IconHeart size={30} color="#FF0000" fill="#FF0000" strokeWidth={1} />
            </button>
        </div>
    );
};

const ControlSection: React.FC<ControlSectionType> = ({ currentlyPlaying }) => (
    <div className="flex flex-col">
        <ProgressBar currentlyPlaying={currentlyPlaying} />
        <ControlButtons currentlyPlaying={currentlyPlaying} />
    </div>
);

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
