import React from 'react';
import { gameHudButtonProps } from '../utils/gameHudFocus';

/**
 * HUD toolbar button — does not retain focus after click (Space stays bound to jump).
 */
const GameHudButton = React.forwardRef(function GameHudButton(
    { onClick, onMouseDown, onPointerDown, className = '', ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type="button"
            className={className}
            onMouseDown={(e) => {
                gameHudButtonProps.onMouseDown(e);
                onMouseDown?.(e);
            }}
            onPointerDown={(e) => {
                gameHudButtonProps.onPointerDown(e);
                onPointerDown?.(e);
            }}
            onClick={(e) => {
                onClick?.(e);
                gameHudButtonProps.onClick(e);
            }}
            {...rest}
        />
    );
});

export default GameHudButton;
