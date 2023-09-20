import React, { PropsWithChildren } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { IconMinus, IconRectangle, IconX } from '@tabler/icons-react';

import { updatePlayingState, selectCurrentlyPlaying } from './reducers/currentlyPlayingSlice';
import { useAppDispatch, useAppSelector } from './utils/redux/hooks';
import useInterval from './utils/useInterval';
import noMusicIcon from '../assets/Music_Icon.png';

import { AlbumSection, ControlSection } from './pages/NowPlaying';

type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

const Button: React.FC<PropsWithChildren<ButtonProps>> = ({ id, className, onClick, isClose, children }) => (
    <button
        type="button"
        className={
            `w-12 h-full flex flex-row justify-center items-center text-black text-opacity-50
            ${isClose ? 'hover:bg-red-500 hover:bg-opacity-50' : 'hover:bg-black hover:bg-opacity-10'} ${className}`
        }
        onClick={onClick ?? (() => {})}
        id={id}
    >
        {children}
    </button>
);

const TopBar: React.FC = () => (
    <div className="h-8 w-full bg-[#0B0B0B] bg-opacity-25 select-none" data-tauri-drag-region>
        <div className="h-full w-min ml-auto flex flex-row">
            <Button onClick={() => appWindow.minimize()}><IconMinus size="15" /></Button>
            <Button onClick={() => {
                appWindow.isMaximized().then((value) => (value ? appWindow.unmaximize() : appWindow.maximize()));
            }}
            >
                <IconRectangle size="15" />
            </Button>
            <Button onClick={() => appWindow.close()} isClose><IconX size="15" /></Button>
        </div>
    </div>
);

const App: React.FC = () => {
    const currentlyPlaying = useAppSelector(selectCurrentlyPlaying);
    const dispatch = useAppDispatch();

    // Detects if currently playing state is set and changes it to '' if it doesn't
    const currentlyPlayingAlbumUrl = currentlyPlaying
        ? currentlyPlaying.item.album.images[0].url
        : noMusicIcon;

    useInterval(() => {
        dispatch(updatePlayingState());
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
                className="w-screen h-screen absolute top-0 left-0 overflow-hidden"
                style={{ backgroundColor: 'rgba(68, 68, 68, 0.1)' }}
            >
                <TopBar />
                <div className="h-full w-full overflow-hidden flex flex-row items-center align-center">
                    <div className="h-full w-full flex flex-col">
                        <div className="h-16 w-full flex flex-row items-center">
                            <p>hello</p>
                        </div>
                        <div className="grow flex ml-8 mr-8 items-center">
                            <div className="grow pb-8">
                                <AlbumSection />
                                <ControlSection />
                            </div>
                        </div>
                    </div>
                    <div className="w-1/2 h-full bg-[#1B1B1B] bg-opacity-25 font-roboto text-white basis-96">
                        <p className="font-medium text-sm mx-4 my-2">Queue</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
