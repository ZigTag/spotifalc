import React, { PropsWithChildren } from 'react';
import { IconX, IconRectangle, IconMinus } from '@tabler/icons';
import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';

type ButtonProps = { id?: string, className?: string, onClick?: () => void, isClose?: boolean }

const Button: React.FC<ButtonProps> = ({ id, className, onClick, isClose, children }: PropsWithChildren<ButtonProps>) => (
    <button
        type="button"
        className={
            `w-12 h-full flex flex-row justify-center items-center text-[#929190] ${isClose ? 'hover:bg-red-500 hover:bg-opacity-50' : 'hover:bg-black hover:bg-opacity-10'} ${className}`
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
    const handleButton = () => {
        invoke('get_now_playing').then((r) => {
            console.log(`Name: '${r}'`);
        });
    };

    return (
        <div>
            <TopBar />
            <p>Testing Text</p>
            <button type="button" onClick={handleButton}>Testing button</button>
        </div>
    );
};

export default App;
