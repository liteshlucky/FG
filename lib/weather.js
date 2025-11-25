import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const SODEPUR_LAT = 22.87;
const SODEPUR_LON = 88.39;

/**
 * Fetch historical weather data for a specific date
 * Note: OpenWeatherMap free tier doesn't support historical data beyond 5 days
 * For demo purposes, we'll simulate weather patterns based on month/season
 */
export async function getWeatherForMonth(year, month) {
    // Simulate weather patterns for Sodepur based on typical seasonal patterns
    const weatherPatterns = getSeasonalWeatherPattern(month);

    // If API key is available, fetch current weather for reference
    if (OPENWEATHER_API_KEY) {
        try {
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?lat=${SODEPUR_LAT}&lon=${SODEPUR_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`
            );

            // Use current weather to adjust patterns
            const currentTemp = response.data.main.temp;
            const currentHumidity = response.data.main.humidity;

            return {
                ...weatherPatterns,
                currentTemp,
                currentHumidity,
                isLiveData: true
            };
        } catch (error) {
            console.error('Weather API error:', error.message);
        }
    }

    return { ...weatherPatterns, isLiveData: false };
}

/**
 * Get typical weather patterns for Sodepur, West Bengal by month
 */
function getSeasonalWeatherPattern(month) {
    const patterns = {
        0: { // January
            avgTemp: 19,
            minTemp: 12,
            maxTemp: 26,
            rainyDays: 1,
            coldDays: 8,
            hotDays: 0,
            avgHumidity: 65,
            season: 'Winter',
            description: 'Cool and dry, pleasant weather'
        },
        1: { // February
            avgTemp: 22,
            minTemp: 15,
            maxTemp: 29,
            rainyDays: 2,
            coldDays: 3,
            hotDays: 0,
            avgHumidity: 60,
            season: 'Winter',
            description: 'Mild and comfortable'
        },
        2: { // March
            avgTemp: 27,
            minTemp: 20,
            maxTemp: 34,
            rainyDays: 3,
            coldDays: 0,
            hotDays: 5,
            avgHumidity: 55,
            season: 'Summer',
            description: 'Warming up, occasional pre-monsoon showers'
        },
        3: { // April
            avgTemp: 30,
            minTemp: 24,
            maxTemp: 37,
            rainyDays: 5,
            coldDays: 0,
            hotDays: 12,
            avgHumidity: 60,
            season: 'Summer',
            description: 'Hot with thunderstorms'
        },
        4: { // May
            avgTemp: 31,
            minTemp: 25,
            maxTemp: 38,
            rainyDays: 8,
            coldDays: 0,
            hotDays: 15,
            avgHumidity: 70,
            season: 'Summer',
            description: 'Very hot and humid, pre-monsoon'
        },
        5: { // June
            avgTemp: 30,
            minTemp: 26,
            maxTemp: 35,
            rainyDays: 18,
            coldDays: 0,
            hotDays: 8,
            avgHumidity: 85,
            season: 'Monsoon',
            description: 'Monsoon begins, heavy rainfall'
        },
        6: { // July
            avgTemp: 29,
            minTemp: 26,
            maxTemp: 33,
            rainyDays: 22,
            coldDays: 0,
            hotDays: 2,
            avgHumidity: 88,
            season: 'Monsoon',
            description: 'Peak monsoon, continuous rain'
        },
        7: { // August
            avgTemp: 29,
            minTemp: 26,
            maxTemp: 33,
            rainyDays: 20,
            coldDays: 0,
            hotDays: 3,
            avgHumidity: 87,
            season: 'Monsoon',
            description: 'Heavy monsoon rains continue'
        },
        8: { // September
            avgTemp: 29,
            minTemp: 25,
            maxTemp: 33,
            rainyDays: 15,
            coldDays: 0,
            hotDays: 5,
            avgHumidity: 85,
            season: 'Monsoon',
            description: 'Monsoon receding, occasional showers'
        },
        9: { // October
            avgTemp: 28,
            minTemp: 23,
            maxTemp: 33,
            rainyDays: 8,
            coldDays: 0,
            hotDays: 6,
            avgHumidity: 75,
            season: 'Post-Monsoon',
            description: 'Pleasant, post-monsoon'
        },
        10: { // November
            avgTemp: 24,
            minTemp: 18,
            maxTemp: 30,
            rainyDays: 2,
            coldDays: 2,
            hotDays: 2,
            avgHumidity: 68,
            season: 'Winter',
            description: 'Cool and comfortable'
        },
        11: { // December
            avgTemp: 20,
            minTemp: 14,
            maxTemp: 27,
            rainyDays: 1,
            coldDays: 6,
            hotDays: 0,
            avgHumidity: 66,
            season: 'Winter',
            description: 'Cold and dry'
        }
    };

    return patterns[month] || patterns[0];
}

/**
 * Analyze weather impact on revenue
 */
export function analyzeWeatherImpact(monthlyData) {
    const analysis = {
        rainyDaysRevenue: { days: 0, totalRevenue: 0, count: 0 },
        hotDaysRevenue: { days: 0, totalRevenue: 0, count: 0 },
        coldDaysRevenue: { days: 0, totalRevenue: 0, count: 0 },
        normalDaysRevenue: { days: 0, totalRevenue: 0, count: 0 }
    };

    monthlyData.forEach(month => {
        if (!month.weather) return;

        const { rainyDays, hotDays, coldDays } = month.weather;
        const daysInMonth = 30; // Approximate
        const normalDays = daysInMonth - rainyDays - hotDays - coldDays;

        // Distribute revenue proportionally
        const revenuePerDay = month.income / daysInMonth;

        if (rainyDays > 0) {
            analysis.rainyDaysRevenue.days += rainyDays;
            analysis.rainyDaysRevenue.totalRevenue += revenuePerDay * rainyDays;
            analysis.rainyDaysRevenue.count++;
        }

        if (hotDays > 0) {
            analysis.hotDaysRevenue.days += hotDays;
            analysis.hotDaysRevenue.totalRevenue += revenuePerDay * hotDays;
            analysis.hotDaysRevenue.count++;
        }

        if (coldDays > 0) {
            analysis.coldDaysRevenue.days += coldDays;
            analysis.coldDaysRevenue.totalRevenue += revenuePerDay * coldDays;
            analysis.coldDaysRevenue.count++;
        }

        if (normalDays > 0) {
            analysis.normalDaysRevenue.days += normalDays;
            analysis.normalDaysRevenue.totalRevenue += revenuePerDay * normalDays;
            analysis.normalDaysRevenue.count++;
        }
    });

    return {
        rainyDays: {
            avgDailyRevenue: analysis.rainyDaysRevenue.days > 0
                ? Math.round(analysis.rainyDaysRevenue.totalRevenue / analysis.rainyDaysRevenue.days)
                : 0,
            totalDays: analysis.rainyDaysRevenue.days
        },
        hotDays: {
            avgDailyRevenue: analysis.hotDaysRevenue.days > 0
                ? Math.round(analysis.hotDaysRevenue.totalRevenue / analysis.hotDaysRevenue.days)
                : 0,
            totalDays: analysis.hotDaysRevenue.days
        },
        coldDays: {
            avgDailyRevenue: analysis.coldDaysRevenue.days > 0
                ? Math.round(analysis.coldDaysRevenue.totalRevenue / analysis.coldDaysRevenue.days)
                : 0,
            totalDays: analysis.coldDaysRevenue.days
        },
        normalDays: {
            avgDailyRevenue: analysis.normalDaysRevenue.days > 0
                ? Math.round(analysis.normalDaysRevenue.totalRevenue / analysis.normalDaysRevenue.days)
                : 0,
            totalDays: analysis.normalDaysRevenue.days
        }
    };
}
