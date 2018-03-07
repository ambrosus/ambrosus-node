pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract BundleRegistry is Ownable {

  mapping(bytes32 => address) public bundleVendors;
  mapping(address => bool) public vendorWhitelist;

  event BundleAdded(bytes32 bundleId);

  modifier onlyWhitelisted() {
    require(vendorWhitelist[msg.sender]);
    _;
  }

  function BundleRegistry() public {
    vendorWhitelist[msg.sender] = true;
  }

  function addBundle(bytes32 bundleId, address vendor) onlyWhitelisted public {
    bundleVendors[bundleId] = vendor;
    BundleAdded(bundleId);
  }

  function addToWhitelist(address vendor) onlyOwner public {
    vendorWhitelist[vendor] = true;
  }

  function removeFromWhitelist(address vendor) onlyOwner public {
    vendorWhitelist[vendor] = false;
  }
}
