import MultiplayerGame from '../../../components/MultiplayerGame.js';
import { getGame } from '../../../lib/games.js';

export default function PlayGameMultiplayerPage({ game }) {
  return <MultiplayerGame game={game} />;
}

export async function getStaticPaths() {
  return {
    paths: [
      { params: { game: 'history' } },
      { params: { game: 'mountains' } },
      { params: { game: 'rivers' } },
    ],
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const game = getGame(params.game);
  return {
    props: { game: game.key },
  };
}