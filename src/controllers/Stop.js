

import React, { useEffect, useRef, useState } from 'react';
import TransitRouteHeader from '../components/TransitRouteHeader';
import TransitMap from '../components/TransitMap';
import TitleBar from '../components/TitleBar';
import TimePoint from '../components/TimePoint';
import StopAccessibilityInformation from '../components/StopAccessibilityInformation';
import LoadingScreen from '../components/LoadingScreen';
import HidePastTripsToggle from '../components/HidePastTripsToggle';
import Footer from '../components/Footer';
import DataFetchError from '../components/DataFetchError';
import AlertList from '../components/AlertList';
import { Link, useParams } from 'react-router-dom';
import { getJSON, isStopTimeUpdateLaterThanNow } from './../util.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLandmark, faWarning } from '@fortawesome/free-solid-svg-icons';
import TimePointLegend from '../components/TimePointLegend';
import StopCode from '../components/StopCode';
import DateSelector from '../components/DateSelector';
import { useCookies } from 'react-cookie';
import dayjs from 'dayjs';

const GTFS_BASE_URL = process.env.REACT_APP_GTFS_BASE_URL;
const REFRESH_VEHICLE_POSITIONS_TTL = 7000;
const REFRESH_ALERTS_TTL = 60 * 1000;
const REFRESH_TRIP_UPDATES_TTL = 60 * 1000;

function Stops() {
  const [stop, setStop] = useState([]);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [vehiclePositions, setVehiclePositions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tripUpdates, setTripUpdates] = useState([]);
  const [isStopLoaded, setStopLoaded] = useState(false);
  const [isTripsLoaded, setTripsLoaded] = useState(false);
  const [isAgenciesLoaded, setAgenciesLoaded] = useState(false);
  const [isRoutesLoaded, setRoutesLoaded] = useState(false);
  const [isVehiclePositionLoaded, setVehiclePositionLoaded] = useState(false);
  const [isAlertsLoaded, setAlertsLoaded] = useState(false);
  const [isTripUpdatesLoaded, setTripUpdatesLoaded] = useState(false);
  const [dataFetchError, setDataFetchError] = useState(false);
  const [hidePastTrips, setHidePastTrips] = useState(true);
  const [cookies, setCookie] = useCookies(['gtfs-schedule-date']);
  const [scheduleDate, setScheduleDate] = useState(cookies['gtfs-schedule-date'] || dayjs().format('YYYY-MM-DD'));
  const map = useRef(null);
  const params = useParams();


  // Consolidated check that things are ready to go
  const isUIReady = [
    isStopLoaded, isTripsLoaded, isRoutesLoaded, isAgenciesLoaded,
    isVehiclePositionLoaded, isAlertsLoaded, isTripUpdatesLoaded
  ].every((a) => a === true);

  const handleCheckboxChange = function(e) {
    setHidePastTrips(e.target.checked === true);
  };

  useEffect(() => {
    getJSON(GTFS_BASE_URL + '/stops/' + params.stop_code + '.json')
      .then((s) => setStop(s))
      .then(() => setStopLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/stops/' + params.stop_code + '/trips.json', { params: { per_page: 2000 } })
      .then((t) => setTrips(t.data))
      .then(() => setTripsLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/stops/' + params.stop_code + '/routes.json')
      .then((r) => setRoutes(r.data))
      .then(() => setRoutesLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/agencies.json')
      .then((a) => setAgencies(a.data))
      .then(() => setAgenciesLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/realtime/vehicle_positions.json')
      .then((data) => setVehiclePositions(data))
      .then(() => setVehiclePositionLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/realtime/alerts.json')
      .then((data) => setAlerts(data))
      .then(() => setAlertsLoaded(true))
      .catch((error) => setDataFetchError(error));

    getJSON(GTFS_BASE_URL + '/realtime/trip_updates.json')
      .then((data) => setTripUpdates(data))
      .then(() => setTripUpdatesLoaded(true))
      .catch((error) => setDataFetchError(error));

    const refreshPositionsInterval = setInterval(() => {
        if (!isUIReady) {
          return;
        }
        getJSON(GTFS_BASE_URL + '/realtime/vehicle_positions.json')
          .then((data) => setVehiclePositions(data));
      }, REFRESH_VEHICLE_POSITIONS_TTL);

    const refreshAlertsInterval = setInterval(() => {
      if (!isUIReady) {
        return;
      }
      getJSON(GTFS_BASE_URL + '/realtime/alerts.json')
        .then((data) => setAlerts(data));
    }, REFRESH_ALERTS_TTL);

    const refreshTripUpdatesInterval = setInterval(() => {
      if (!isUIReady) {
        return;
      }
      getJSON(GTFS_BASE_URL + '/realtime/trip_updates.json')
        .then((data) => setTripUpdates(data));
    }, REFRESH_TRIP_UPDATES_TTL);

    // Run on unmount
    return () => {
      clearInterval(refreshPositionsInterval);
      clearInterval(refreshAlertsInterval);
      clearInterval(refreshTripUpdatesInterval);
    };
  }, [isUIReady, params.stop_code]);

  if (dataFetchError) {
    return(<DataFetchError error={dataFetchError}></DataFetchError>);
  }

  if (!isUIReady) {
    return(<LoadingScreen></LoadingScreen>);
  }

  // Filter vehicle positions to relevant trips
  const filteredVehiclePositions = [];
  const tripsAtStop = trips.map((t) => t.trip_gid);
  vehiclePositions.forEach(vp => {
    if (tripsAtStop.includes(vp.vehicle.trip.trip_id)) {
      filteredVehiclePositions.push(vp);
    }
  });

  // Filter alerts to single stop
  let stopAlerts = [];
  alerts.forEach(a => {
    a.alert.informed_entity.forEach(e => {
      if (e.stop_id === stop.stop_code) {
        stopAlerts.push(a);
      }
    });
  });

  // Filter trip updates to a single stop
  let stopTripUpdates = [];
  tripUpdates.forEach(tu => {
    tu.trip_update.stop_time_update.forEach(u => {
      if (u.stop_id === stop.stop_code) {
        stopTripUpdates.push(tu);
      }
    });
  });

  // Sort trips by time at stop
  trips.sort((a, b) => {
    const aTime = a.stop_times[0].arrival_time ? a.stop_times[0].arrival_time : a.stop_times[0].departure_time;
    const bTime = b.stop_times[0].arrival_time ? b.stop_times[0].arrival_time : b.stop_times[0].departure_time;
    if (aTime === bTime) {
      return parseInt(a.route_gid, 10) - parseInt(b.route_gid, 10);
    }
    return aTime > bTime;
  });

  // Assign current stop to be rendered
  const stops = [stop];

  // If a parent station, sort and render additional stops
  if (stop.child_stops.length > 0) {
    stop.child_stops.sort((a, b) => a.stop_code > b.stop_code);
    stop.child_stops.map((item) => stops.push(item));
  }

  // Nest stops inside an object
  const routeStops = stops.map((item) => {
    return { id: item.id, stop: item };
  });

  // Load in selected date
  const handleDateFieldChange = (event) => {
    if (!event.target.value) {
      return;
    }
    setCookie('gtfs-schedule-date', event.target.value, { path: '/', maxAge: 90, sameSite: 'none', secure: true });
    setScheduleDate(event.target.value);
    getJSON(GTFS_BASE_URL + '/stops/' + params.stop_code + '/trips.json', { params: { date: event.target.value, per_page: 500 } })
      .then((st) => setTrips(st.data));
  };

  return(
    <div>
      <TitleBar></TitleBar>
      <div className="container">
        <div className="stop-name">{stop.stop_name}</div>
        {stopAlerts.length > 0 &&
          (<div className="p-2 mb-2 text-center bg-warning rounded-bottom" style={{marginTop: '-1em'}}><FontAwesomeIcon icon={faWarning} fixedWidth={true}></FontAwesomeIcon> System Alert at Stop</div>)
        }
        <div className="text-center p-2 mb-2">
          <div><StopCode stop={stop}/> {stop.stop_desc}</div>
          {stop.parent_station_gid && (
            <div className="p-2 mb-2"><FontAwesomeIcon icon={faLandmark} fixedWidth={true}></FontAwesomeIcon> <strong>Inside <Link to={'/stops/' + stop.parent_station_gid}>{stop.parent_station.stop_name}</Link></strong></div>
          )}
        </div>
        <div className="text-center p-2 mb-2">
          <StopAccessibilityInformation stop={stop}></StopAccessibilityInformation>
        </div>
        {stop.child_stops.length > 0 && (
          <div className="card mb-3 small">
            <div className="card-header">Station Stops</div>
            <div className="card-body">
              <div className="row">
                {stop.child_stops.map((item) => {
                  return(
                    <div key={item.id} className="col-sm-6 col-md-4 col-lg-3"><Link to={'/stops/' + item.stop_code}>{item.stop_name}</Link></div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {routes.length > 0 && (
          <>
            <div className="row mb-2">
              {routes.sort((a, b) => parseInt(a.route_short_name, 10) - parseInt(b.route_short_name, 10)).map((item) => {
                const routeAlerts = alerts.filter((a) => a.alert.informed_entity[0].route_id === item.route_gid);
                return(
                  <div key={item.id} className="col-md-4">
                    <TransitRouteHeader route={item} alerts={routeAlerts} showRouteType={true}></TransitRouteHeader>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <TransitMap center={[stop.stop_lat, stop.stop_lon]} zoom={19} map={map} vehicleMarkers={filteredVehiclePositions} routes={routes} agencies={agencies} routeStops={routeStops} alerts={alerts}></TransitMap>
        <AlertList alerts={stopAlerts} routes={routes}></AlertList>
        {trips.length > 0 && (
          <>
            <div className="d-flex align-items-center mb-2">
              <div className="flex-grow-1">
                <HidePastTripsToggle hidePastTrips={hidePastTrips} onChange={handleCheckboxChange} />
              </div>
              <div>
                {typeof handleDateFieldChange === 'function' && (
                  <DateSelector scheduleDate={scheduleDate} handleDateFieldChange={handleDateFieldChange} />
                )}
              </div>
            </div>
            <div className="table-responsive-md">
              <table className="table table-sm small">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Trip</th>
                    <th>Headsign</th>
                    <th className="bg-dark text-light text-center">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((item, _index) => {
                    const route = routes.find((r) => r.route_gid === item.route_gid);
                    const routeAlerts = alerts.filter((a) => a.alert.informed_entity[0].route_id === item.route_gid);
                    // Find stop time update relevant to this trip and this stop
                    let stopTimeUpdate = {};
                    if (stopTripUpdates.length > 0) {
                      const stopTimeTripUpdate = stopTripUpdates.filter((s) => s.trip_update.trip.trip_id === item.trip_gid);
                      if (stopTimeTripUpdate.length > 0) {
                        stopTimeTripUpdate[0].trip_update.stop_time_update.map((stu) => {
                          if (stu.stop_id === stop.stop_code) {
                            stopTimeUpdate = stu;
                          }
                        });
                      }
                    }

                    let rowClasses = '';
                    if (!isStopTimeUpdateLaterThanNow(item.stop_times[0], stopTimeUpdate)) {
                      if (hidePastTrips) {
                        return;
                      }
                      rowClasses = 'border-start border-gray border-5';
                    }

                    return(
                      <tr key={item.id} className={rowClasses}>
                        <td className="align-middle"><TransitRouteHeader route={route} alerts={routeAlerts}></TransitRouteHeader></td>
                        <td className="align-middle"><Link to={'/trips/' + item.trip_gid}>{item.trip_gid}</Link></td>
                        <td className="align-middle">
                          <strong>{item.trip_headsign}</strong><br />
                          {item.direction_id === "1" ? 'Inbound' : 'Outbound'}
                        </td>
                        <td className="align-middle text-center text-nowrap ">
                          <TimePoint scheduleData={item.stop_times[0]} updateData={stopTimeUpdate}></TimePoint>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TimePointLegend></TimePointLegend>
            </div>
          </>
        )}
        {trips.length == 0 && (
          <div className="alert alert-info">No active trips use this stop.</div>
        )}
      </div>
      <Footer></Footer>
    </div>
  );
}

export default Stops;
