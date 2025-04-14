// Main entry point for the TradeSkills application
import { initApp } from './app.js';
import { initializeDatabase } from './init-database.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing TradeSkills application...');

    try {
        // Initialize the database
        console.log('Initializing database...');
        const dbResult = await initializeDatabase();
        if (dbResult.success) {
            console.log('Database initialized successfully');
        } else {
            console.warn('Database initialization warning:', dbResult.error);
            // Continue even if database initialization fails
        }

        // Initialize the main application
        await initApp();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});
