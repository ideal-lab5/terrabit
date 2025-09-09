import { useMemo } from 'react';
import { useCubeStore } from './game.component';
import { Avatar } from '../../Avatar';

export const Players = () => {
    const cubes = useCubeStore((state) => state.cubes);

    // Use useMemo to prevent unnecessary re-renders
    const avatars = useMemo(() => {
        return cubes.map((cube) => (
            <Avatar 
                key={cube.id} 
                position={[cube.x, cube.y, cube.z]} 
            />
        ));
    }, [cubes]);

    return <>{avatars}</>;
};