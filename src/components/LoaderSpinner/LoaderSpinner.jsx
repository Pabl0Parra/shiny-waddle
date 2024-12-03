import { Circles } from 'react-loader-spinner';

const LoaderSpinner = ({
  visible = true,
  height = 80,
  width = 80,
  color = '#00BFFF',
  text = 'チャートを読み込み中', // Default Japanese text --> Loading chart
}) => {
  return (
    <div className="loader-spinner" style={styles.container}>
      {visible && (
        <>
          <div style={styles.text}>{text}</div>
          <Circles
            height={height}
            width={width}
            color={color}
            ariaLabel="loading-indicator"
          />
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  text: {
    fontSize: '2em',
    marginBottom: '2vh',
  },
};

export default LoaderSpinner;
