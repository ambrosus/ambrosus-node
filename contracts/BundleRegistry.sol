pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract BundleRegistry is Ownable {

  struct Vendor {
    bool whitelisted;
    string url;
  }

  struct Bundle {
    address creator;    
  }

  mapping(bytes32 => Bundle) public bundles;
  mapping(address => Vendor) public vendors;
  
  bytes32[] public bundleIds;

  event BundleAdded(bytes32 bundleId);

  modifier onlyWhitelisted() {
    require(isWhitelisted(msg.sender));
    _;
  }

  function BundleRegistry() public {
  }

  function addBundle(bytes32 bundleId, address vendor) onlyWhitelisted public {
    bundleIds.push(bundleId);
    bundles[bundleId] = Bundle(vendor);    
    BundleAdded(bundleId);
  }
 
  function getBundleCount() public view returns(uint) {
    return bundleIds.length;
  }

  function getVendorForBundle(bytes32 bundleId) public view returns (address) {
    return bundles[bundleId].creator;
  }

  function addToWhitelist(address vendor, string url) onlyOwner public {
    vendors[vendor].whitelisted = true;
    vendors[vendor].url = url;
  }

  function removeFromWhitelist(address vendor) onlyOwner public {
    vendors[vendor].whitelisted = false;
  }

  function isWhitelisted(address vendor) view public returns (bool) {
    return vendors[vendor].whitelisted;
  }

  function changeVendorUrl(address vendor, string url) onlyOwner public {
    vendors[vendor].url = url;
  }

  function getUrlForVendor(address vendor) public view returns (string) {
    return vendors[vendor].url;
  }

}
