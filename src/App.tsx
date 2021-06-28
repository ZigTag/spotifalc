import React, { PropsWithChildren, useState } from 'react';
import { IconX, IconRectangle, IconMinus } from '@tabler/icons';
import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';

type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

const Button: React.FC<ButtonProps> = ({ id, className, onClick, isClose, children }: PropsWithChildren<ButtonProps>) => (
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
            <Button onClick={appWindow.minimize}><IconMinus size="15" /></Button>
            <Button onClick={appWindow.maximize}><IconRectangle size="15" /></Button>
            <Button onClick={appWindow.close} isClose><IconX size="15" /></Button>
        </div>
    </div>
);

const App: React.FC = () => {
    const [albumUrl, setAlbumUrl] = useState<string>('');

    const getAlbum = () => {
        invoke('get_album', { albumId: '5ZCo1wqpAvjgHieipwTXzZ' }).then((r) => {
            setAlbumUrl(r.images[0].url);
        });
    };

    const getCurrentlyPlaying = () => {
        invoke('get_currently_playing', { albumId: '5ZCo1wqpAvjgHieipwTXzZ' }).then((r) => {
            setAlbumUrl(r.item.album.images[0].url);
        });
    };

    return (
        <>
            <div
                className="w-screen h-screen relative"
                style={{
                    background: `url(${albumUrl})`,
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
                <TopBar />
                <div className="flex flex-col">
                    <button type="button" onClick={getAlbum}>Get Album</button>
                    <button type="button" onClick={getCurrentlyPlaying}>Get Currently Playing</button>
                </div>
            </div>
        </>
    );
};

export default App;
