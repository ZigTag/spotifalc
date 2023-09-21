import React, { PropsWithChildren, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { IconBook, IconBookmark, IconDevices2, IconHome2, IconMinus, IconRectangle, IconSearch, IconSettings, IconShare, IconUser, IconX } from '@tabler/icons-react';

import { invoke } from '@tauri-apps/api/tauri';
import { updatePlayingState, selectCurrentlyPlaying } from './reducers/currentlyPlayingSlice';
import { useAppDispatch, useAppSelector } from './utils/redux/hooks';
import useInterval from './utils/useInterval';
import noMusicIcon from '../assets/Music_Icon.png';

import { AlbumSection, ControlSection } from './pages/NowPlaying';

type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

const TopButton: React.FC<PropsWithChildren<ButtonProps>> = ({ id, className, onClick, isClose, children }) => (
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

const MenuButton: React.FC<PropsWithChildren<ButtonProps>> = ({ id, className, onClick, children }) => (
    <button
        type="button"
        className={
            `w-16 h-full flex flex-row justify-center items-center text-black text-opacity-50
            opacity-30 hover:opacity-100 ${className}`
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
            <TopButton onClick={() => appWindow.minimize()}><IconMinus size="15" color="#ffffff" /></TopButton>
            <TopButton onClick={() => {
                appWindow.isMaximized().then((value) => (value ? appWindow.unmaximize() : appWindow.maximize()));
            }}
            >
                <IconRectangle size="15" color="#ffffff" />
            </TopButton>
            <TopButton onClick={() => appWindow.close()} isClose><IconX size="18" color="#ffffff" /></TopButton>
        </div>
    </div>
);

const TopMenu: React.FC<{ userInfo: any}> = ({ userInfo }) => (
    <div className="h-16 w-full flex flex-row items-center px-4">
        <MenuButton><IconSearch color="#ffffff" /></MenuButton>
        <MenuButton><IconHome2 color="#ffffff" /></MenuButton>
        <MenuButton><IconBookmark color="#ffffff" /></MenuButton>
        <MenuButton><IconBook color="#ffffff" /></MenuButton>
        <MenuButton><IconSettings color="#ffffff" /></MenuButton>
        <MenuButton><IconDevices2 color="#ffffff" /></MenuButton>
        <MenuButton><IconShare color="#ffffff" /></MenuButton>

        <div className="flex text-white space-x-4 m-4 font-roboto font-md">
            <span className="opacity-30">|</span>
            <div className="flex space-x-2 opacity-30 hover:opacity-100">
                <IconUser color="#ffffff" />
                <span>{userInfo === null ? 'Nuh uh' : userInfo.display_name}</span>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    const currentlyPlaying = useAppSelector(selectCurrentlyPlaying);
    const dispatch = useAppDispatch();

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    const handleAuthenticate = () => {
        invoke('login').then();
    };

    // Detects if currently playing state is set and changes it to '' if it doesn't
    const currentlyPlayingAlbumUrl = currentlyPlaying
        ? currentlyPlaying.item.album.images[0].url
        : noMusicIcon;

    useInterval(() => {
        invoke('authenticated').then((val) => setIsAuthenticated(val as boolean));

        if (isAuthenticated) {
            if (userInfo === null) {
                invoke('get_me').then((val) => setUserInfo(val));
            }
            dispatch(updatePlayingState());
        }
    }, (1000));

    return (
        <div>
            { isAuthenticated ? (
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
                                <TopMenu userInfo={userInfo} />
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
            ) : (
                <div className="w-screen h-screen absolute top-0 left-0 overflow-hidden">
                    <TopBar />
                    <button onClick={handleAuthenticate} type="button">win</button>
                </div>
            )}
        </div>
    );
};

export default App;
