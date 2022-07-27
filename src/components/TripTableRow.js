import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBicycle, faWheelchair, faBan } from "@fortawesome/free-solid-svg-icons";
import { isTimeRangeIncludesNow, isStopTimeUpdateLaterThanNow } from "../util";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import TimePoint from './TimePoint';

function TripTableRow({trip, route, tripUpdate, hidePastTrips}) {
  const bikes_allowed_icon = (trip.bikes_allowed !== "1")
    ? (<span className="text-danger"><FontAwesomeIcon icon={faBan} fixedWidth={true}></FontAwesomeIcon></span>)
    : (<></>);
  const wheelchair_accessible_icon = (trip.wheelchair_accessible !== "1")
  ? (<span className="text-danger"><FontAwesomeIcon icon={faBan} fixedWidth={true}></FontAwesomeIcon></span>)
  : (<></>);

  const bikes_allowed_tooltip = (trip.bikes_allowed === '1')
    ? 'Vehicle being used on this particular trip can accommodate at least one bicycle.'
    : 'No bicycles are allowed on this trip.';

  const wheelchair_accessible_tooltip = (trip.wheelchair_accessible === '1')
    ? 'Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.'
    : 'No riders in wheelchairs can be accommodated on this trip.';

  let updateStart = {};
  let updateEnd = {};
  if (typeof tripUpdate.trip_update !== 'undefined') {
    updateStart = tripUpdate.trip_update.stop_time_update.find((i) => i.stop_sequence === 1) || {};
    updateEnd = tripUpdate.trip_update.stop_time_update.find((i) => i.stop_sequence === trip.stop_times[trip.stop_times.length - 1].stop_sequence) || {};
  }

  let rowClasses = '';
  if (isTimeRangeIncludesNow(trip.start_time, trip.end_time)) {
    rowClasses = 'border-start border-primary border-5';
  } else if (!isStopTimeUpdateLaterThanNow(trip.stop_times[trip.stop_times.length - 1], updateEnd)) {
    if (hidePastTrips) {
      return;
    }
    rowClasses = 'border-start border-gray border-5';
  }

  return(
    <tr className={rowClasses}>
      <td><a href={'/trips/' + trip.trip_gid}>{trip.trip_gid}</a></td>
      <td className="text-center text-nowrap">
        <TimePoint scheduleData={trip.stop_times[0]} updateData={updateStart}></TimePoint>
      </td>
      <td className="text-center text-nowrap">
        <TimePoint scheduleData={trip.stop_times[trip.stop_times.length - 1]} updateData={updateEnd}></TimePoint>
      </td>
      <td>
        {trip.route_gid !== route.route_gid && (
          <span className="badge bg-secondary me-1">{trip.route_gid}</span>
        )}
        {trip.trip_headsign}
      </td>
      <td>
        <OverlayTrigger placement='top' overlay={<Tooltip>{wheelchair_accessible_tooltip}</Tooltip>}>
          <div className="fa-layers fa-fw me-1">
            <FontAwesomeIcon icon={faWheelchair} fixedWidth={true}></FontAwesomeIcon>
            {wheelchair_accessible_icon}
          </div>
        </OverlayTrigger>
        <OverlayTrigger placement='top' overlay={<Tooltip>{bikes_allowed_tooltip}</Tooltip>}>
          <div className="fa-layers fa-fw">
            <FontAwesomeIcon icon={faBicycle} fixedWidth={true}></FontAwesomeIcon>
            {bikes_allowed_icon}
          </div>
        </OverlayTrigger>
      </td>
    </tr>
  );
}

TripTableRow.propTypes = {
  trip: PropTypes.object.isRequired,
  route: PropTypes.object.isRequired,
  tripUpdate: PropTypes.object,
  hidePastTrips: PropTypes.bool
};

TripTableRow.defaultProps = {
  trip: {},
  route: {},
  tripUpdate: {},
  hidePastTrips: false
};

export default TripTableRow;
