import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
    IconPlayerPlay,
    IconPlayerTrackPrev,
    IconPlayerTrackNext,
    IconArrowForwardUp,
    IconArrowBackUp,
    IconPlayerPause,
    IconHeart,
} from '@tabler/icons-react';
import noMusicIcon from '../../assets/Music_Icon.png';
import { leadingZero } from '../utils/utils';
import { useAppSelector } from '../utils/redux/hooks';
import { selectCurrentlyPlaying } from '../reducers/currentlyPlayingSlice';

type ProgressBarType = {}

type ControlButtonsType = {}

type ControlSectionType = {}

type AlbumSectionType = {}

const ProgressBar: React.FC<ProgressBarType> = () => {
    const currentlyPlaying = useAppSelector(selectCurrentlyPlaying);

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

export const AlbumSection: React.FC<AlbumSectionType> = () => {
    const currentlyPlaying = useAppSelector(selectCurrentlyPlaying);

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

const ControlButtons: React.FC<ControlButtonsType> = () => {
    const currentlyPlaying = useAppSelector(selectCurrentlyPlaying);

    const [prevCurrentlyPlaying, setPrevCurrentlyPlaying] = useState<any>();
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        if (prevCurrentlyPlaying !== currentlyPlaying) {
            const masterIsPlaying = currentlyPlaying
                ? currentlyPlaying.is_playing
                : false;

            if (isPlaying !== masterIsPlaying) {
                setIsPlaying(masterIsPlaying);
            }
        }

        setPrevCurrentlyPlaying(currentlyPlaying);
    }, [currentlyPlaying]);

    const onPausePlayback = () => {
        invoke('pause_playback').then();
        setIsPlaying(!isPlaying);
    };

    const onStartPlayback = () => {
        invoke('start_playback').then();
        setIsPlaying(!isPlaying);
    };

    const onNextTrack = () => {
        invoke('next_track').then();
    };

    const onPreviousTrack = () => {
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
                onClick={onPreviousTrack}
            >
                <IconPlayerTrackPrev size={30} fill="#FFF" color="#FFF" strokeWidth="4" />
            </button>
            {isPlaying
                ? (
                    <button
                        type="button"
                        onClick={onPausePlayback}
                    >
                        <IconPlayerPause size={40} fill="#FFF" color="#FFF" strokeWidth="2" />
                    </button>
                )
                : (
                    <button
                        type="button"
                        onClick={onStartPlayback}
                    >
                        <IconPlayerPlay size={40} fill="#FFF" color="#FFF" strokeWidth="4" />
                    </button>
                )}
            <button
                type="button"
                onClick={onNextTrack}
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
                <IconHeart size={30} color="#FF0000" fill="#FF0000" strokeWidth="1" />
            </button>
        </div>
    );
};

export const ControlSection: React.FC<ControlSectionType> = () => (
    <div className="flex flex-col">
        <ProgressBar />
        <ControlButtons />
    </div>
);
