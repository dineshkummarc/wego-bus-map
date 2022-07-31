import React, { useState } from 'react';
import PropTypes from 'prop-types';
import trainIcon from '../resources/train.svg';
import L from 'leaflet';
import busIcon from '../resources/bus.svg';
import AlertModal from './AlertModal';
import { Tooltip } from 'react-bootstrap';
import { OverlayTrigger } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './TransitRouteHeader.scss';

function TransitRouteHeader({route, alerts, showRouteType}) {
  const [alertModalShow, setAlertModalShow] = useState(false);

  if (typeof route !== 'object' || !route.route_short_name) {
    return(<div className="transit-route-header">Invalid route!</div>);
  }

  const routeStyle = {
    backgroundColor: '#' + route.route_color,
    color: '#' + route.route_text_color
  };

  let vehicleIcon = busIcon;
  if (route.route_type === "2") {
    vehicleIcon = trainIcon;
  }

  const routeAlertIcon = (
    <span className="transit-route-header-alert-trigger" onClick={() => setAlertModalShow(true)}>
      <FontAwesomeIcon icon={faExclamationTriangle} fixedWidth={true}></FontAwesomeIcon>
    </span>
  );

  return(
    <div className="transit-route-header d-flex" style={routeStyle} title={route.route_desc}>
      {showRouteType && (
        <div>
          <img className="me-2" style={{height: '1.5rem'}} src={vehicleIcon} alt="Icon" title={'Route Type: ' + route.route_type } />
        </div>
      )}
      <div className="flex-grow-1 align-bottom">
        <Link to={'/routes/' + route.route_short_name}><span className="badge text-bg-light">{route.route_short_name}</span> {route.route_long_name}</Link>
      </div>
      <div>
        {alerts.length > 0 && (
          <div className="ms-2">
            {L.Browser.mobile === false ? (
              <OverlayTrigger placement={'top'} overlay={<Tooltip>{alerts.length > 1 ? alerts.length + ' alerts' : '1 alert'}</Tooltip>}>
                {routeAlertIcon}
              </OverlayTrigger>
            ) : (
              <>{routeAlertIcon}</>
            )}
            <AlertModal alerts={alerts} show={alertModalShow} onHide={() => setAlertModalShow(false)} routes={[route]}></AlertModal>
          </div>
        )}
      </div>
    </div>
  );
}

TransitRouteHeader.propTypes = {
  route: PropTypes.object.isRequired,
  alerts: PropTypes.array,
  showRouteType: PropTypes.bool
};

TransitRouteHeader.defaultProps = {
  alerts: [],
  showRouteType: false
};

export default TransitRouteHeader;
