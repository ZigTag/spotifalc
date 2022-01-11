import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/tauri';
import { RootState } from '../utils/redux/store';

type initialStateType = {
    value: any
}

const initialState: initialStateType = { value: undefined };

export const updatePlayingState = createAsyncThunk(
    'currentlyPlaying/updatePlayingState',
    async () => {
        const response = await invoke('get_currently_playing');

        return response;
    },
);

export const currentlyPlayingSlice = createSlice({
    name: 'currentlyPlaying',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(updatePlayingState.fulfilled, (state, action: PayloadAction<any>) => {
                state.value = action.payload;
            });
    },
});

export const selectCurrentlyPlaying = (state: RootState) => state.currentlyPlaying.value;

export default currentlyPlayingSlice.reducer;
