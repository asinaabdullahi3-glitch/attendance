import { useTheme } from '../utils/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, changeTheme } = useTheme();

  const themes = [
    { id: 'default', name: 'Default', color: '#c2410c' },
    { id: 'blue', name: 'Blue', color: '#2563eb' },
    { id: 'pink', name: 'Pink', color: '#db2777' },
  ];

  return (
    <div className="theme-switcher">
      <span className="theme-label">Theme:</span>
      <div className="theme-options">
        {themes.map((t) => (
          <button
            key={t.id}
            className={`theme-button ${theme === t.id ? 'active' : ''}`}
            onClick={() => changeTheme(t.id)}
            title={t.name}
            aria-label={`Switch to ${t.name} theme`}
          >
            <span
              className="theme-color"
              style={{ backgroundColor: t.color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
