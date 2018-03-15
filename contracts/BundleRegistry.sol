pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract BundleRegistry is Ownable {

  struct Vendor {
    bool whitelisted;
    string url;
  }

  mapping(bytes32 => address) public bundleVendors;
  mapping(address => Vendor) public vendors;

  event BundleAdded(bytes32 bundleId);

  modifier onlyWhitelisted() {
    require(isWhitelisted(msg.sender));
    _;
  }

  function BundleRegistry() public {
  }

  function addBundle(bytes32 bundleId, address vendor) onlyWhitelisted public {
    bundleVendors[bundleId] = vendor;
    BundleAdded(bundleId);
  }

  function addToWhitelist(address vendor, string url) onlyOwner public {
    vendors[vendor].whitelisted = true;
    vendors[vendor].url = url;
  }

  function removeFromWhitelist(address vendor) onlyOwner public {
    vendors[vendor].whitelisted = false;
  }

  function isWhitelisted(address vendor) constant public returns (bool) {
    return vendors[vendor].whitelisted;
  }

  function changeVendorUrl(address vendor, string url) onlyOwner public {
    vendors[vendor].url = url;
  }

  function getUrlForVendor(address vendor) public view returns (string) {
    return vendors[vendor].url;
  }
  
}
