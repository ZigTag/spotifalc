import { configureStore } from '@reduxjs/toolkit';
import currentlyPlayingReducer from '../../reducers/currentlyPlayingSlice';

const store = configureStore({ reducer: { currentlyPlaying: currentlyPlayingReducer } });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
