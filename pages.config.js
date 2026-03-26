/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import PalsgaardPulsOverview from './pages/PalsgaardPulsOverview';
import PalsgaardPulsChannels from './pages/PalsgaardPulsChannels';
import Campaigns from './pages/Campaigns';
import Distributors from './pages/Distributors';
import Settings from './pages/Settings';
import BudgetCostLines from './pages/BudgetCostLines';
import ChannelPerformance from './pages/ChannelPerformance';
import DataImport from './pages/DataImport';
import EventsWebinars from './pages/EventsWebinars';
import AuditLog from './pages/AuditLog';
import ExecutiveOverview from './pages/ExecutiveOverview';
import FunnelDiagnostics from './pages/FunnelDiagnostics';
import Overview from './pages/Overview';
import PartnerDES from './pages/PartnerDES';
import PerformanceDrivers from './pages/PerformanceDrivers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "PalsgaardPulsOverview": PalsgaardPulsOverview,
    "AuditLog": AuditLog,
    "PalsgaardPulsChannels": PalsgaardPulsChannels,
    "Campaigns": Campaigns,
    "Distributors": Distributors,
    "Settings": Settings,
    "BudgetCostLines": BudgetCostLines,
    "ChannelPerformance": ChannelPerformance,
    "DataImport": DataImport,
    "EventsWebinars": EventsWebinars,
    "ExecutiveOverview": ExecutiveOverview,
    "FunnelDiagnostics": FunnelDiagnostics,
    "Overview": Overview,
    "PartnerDES": PartnerDES,
    "PerformanceDrivers": PerformanceDrivers,
}

export const pagesConfig = {
    mainPage: "PalsgaardPulsOverview",
    Pages: PAGES,
    Layout: __Layout,
};